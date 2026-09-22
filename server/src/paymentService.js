const crypto = require('crypto');
const Razorpay = require('razorpay');
const mongoose = require('mongoose');
const { GymPlan, Payment, Subscription, WebhookEvent, User, Notification } = require('./models');

function getRazorpayClient() {
  const key_id = (process.env.RAZORPAY_KEY_ID || '').trim();
  const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!key_id || !key_secret) {
    throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env');
  }
  return new Razorpay({ key_id, key_secret });
}

function validString(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 120;
}

// Compare signatures in constant time so forged payment responses cannot be accepted.
function verifyHmac(payload, signature, secret) {
  if (!Buffer.isBuffer(payload) && typeof payload !== 'string') return false;
  if (!validString(signature) || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');
  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function createOrder({ userId, plan }) {
  const client = getRazorpayClient();
  if (!validString(userId) || !plan || !Number.isSafeInteger(plan.price) || plan.price < 1) {
    throw new Error('Invalid payment request');
  }

  // Supersede any previous uncompleted pending payments so member is never locked out
  await Payment.updateMany(
    { userId, status: 'PENDING' },
    { $set: { status: 'CANCELLED', failureReason: 'Superseded by new checkout attempt' } }
  );

  const order = await client.orders.create({
    amount: plan.price * 100, // in paise
    currency: 'INR',
    receipt: `gym_${userId.slice(0, 14)}_${Date.now()}`.slice(0, 40),
    notes: { userId, planId: String(plan.id || plan._id) },
  });

  const payment = await Payment.create({
    userId,
    planId: String(plan.id || plan._id),
    amount: plan.price,
    currency: 'INR',
    razorpayOrderId: order.id,
    status: 'PENDING',
    paymentMethod: 'ONLINE',
  });

  return order;
}

async function activateCapturedPayment({ orderId, paymentId, expectedUserId, paymentEntity }) {
  if (!validString(orderId) || !validString(paymentId)) throw new Error('Invalid Razorpay payment details');
  const client = getRazorpayClient();
  let storedPayment = await Payment.findOne({ razorpayOrderId: orderId });
  let razorpayPayment = paymentEntity;

  if (!storedPayment || !razorpayPayment) {
    razorpayPayment = paymentEntity || await client.payments.fetch(paymentId);
  }

  // If payment was initiated via a Razorpay Payment Link or direct checkout containing notes
  if (!storedPayment && razorpayPayment?.notes?.userId && razorpayPayment?.notes?.planId) {
    storedPayment = await Payment.create({
      userId: razorpayPayment.notes.userId,
      planId: razorpayPayment.notes.planId,
      amount: Math.round(Number(razorpayPayment.amount) / 100),
      currency: razorpayPayment.currency || 'INR',
      razorpayOrderId: orderId,
      status: 'PENDING',
      paymentMethod: (razorpayPayment.method || 'ONLINE').toUpperCase(),
    });
  }

  if (!storedPayment) throw new Error('Payment order not found');
  if (expectedUserId && storedPayment.userId !== expectedUserId) throw new Error('Payment does not belong to this user');
  if (storedPayment.razorpayPaymentId && storedPayment.razorpayPaymentId !== paymentId) throw new Error('Payment already linked to another transaction');
  if (storedPayment.status === 'CAPTURED') return { payment: storedPayment, alreadyProcessed: true };

  if (razorpayPayment.order_id !== orderId) throw new Error('Razorpay order mismatch');
  if (Number(razorpayPayment.amount) !== storedPayment.amount * 100 || razorpayPayment.currency !== storedPayment.currency) {
    throw new Error('Razorpay amount mismatch');
  }

  // If status is 'authorized', capture it
  if (razorpayPayment.status === 'authorized') {
    razorpayPayment = await client.payments.capture(paymentId, storedPayment.amount * 100, storedPayment.currency);
  }

  if (razorpayPayment.status !== 'captured') throw new Error(`Payment has not been captured (status: ${razorpayPayment.status})`);

  // Compute duration and dates from actual plan
  const plan = await GymPlan.findById(storedPayment.planId);
  if (!plan) throw new Error('Plan unavailable');
  const planName = plan.name || 'Membership';
  const duration = Number(plan.duration || 1);
  const unit = plan.durationUnit || 'MONTHS';

  const applyActivation = async (session = null) => {
    const payment = await Payment.findOne({ _id: storedPayment._id }).session(session);
    if (!payment) throw new Error('Payment order not found');
    if (payment.status === 'CAPTURED') {
      return { payment, alreadyProcessed: true };
    }

    payment.razorpayPaymentId = paymentId;
    payment.paymentMethod = (razorpayPayment.method || 'ONLINE').toUpperCase();
    payment.status = 'CAPTURED';
    payment.activatedAt = new Date();
    await payment.save({ session });

    const now = new Date();
    const existingSub = await Subscription.findOne({ userId: payment.userId }).session(session);

    // Renewal rule: if existing subscription is ACTIVE and endDate is in future, extend from endDate; otherwise start now
    const startsAt = (existingSub && existingSub.status === 'ACTIVE' && existingSub.endDate && new Date(existingSub.endDate) > now)
      ? new Date(existingSub.endDate)
      : new Date(now);

    const endDate = new Date(startsAt);
    if (unit === 'DAYS') {
      endDate.setDate(endDate.getDate() + duration);
    } else if (unit === 'YEARS') {
      endDate.setFullYear(endDate.getFullYear() + duration);
    } else {
      endDate.setMonth(endDate.getMonth() + duration);
    }
    endDate.setHours(23, 59, 59, 999);

    const subscription = await Subscription.findOneAndUpdate(
      { userId: payment.userId },
      {
        $set: {
          planId: String(plan._id),
          planName,
          startDate: startsAt,
          endDate,
          status: 'ACTIVE',
          paymentId: String(payment._id),
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: paymentId,
          paymentMethod: payment.paymentMethod || 'ONLINE',
          amount: payment.amount,
        },
      },
      { upsert: true, returnDocument: 'after', session }
    );

    // Ensure member is marked active
    await User.updateOne({ _id: payment.userId }, { $set: { isActive: true } }).session(session);

    // Mark previous expiry alerts as resolved
    await Notification.updateMany(
      { memberId: payment.userId, type: { $in: ['EXPIRED', 'EXPIRY_1_DAY', 'EXPIRY_3_DAYS'] } },
      { $set: { read: true } }
    ).session(session);

    return { payment, subscription, alreadyProcessed: false };
  };

  // Run with MongoDB transaction if available, else sequential fallback
  let session = null;
  try {
    session = await mongoose.startSession();
    let res;
    await session.withTransaction(async () => {
      res = await applyActivation(session);
    });
    return res;
  } catch (err) {
    return await applyActivation(null);
  } finally {
    if (session) await session.endSession();
  }
}

async function verifyPayment({ userId, orderId, paymentId, signature }) {
  const payload = `${orderId}|${paymentId}`;
  const secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  if (!secret) throw new Error('Razorpay is not configured (missing secret in environment)');
  if (!verifyHmac(payload, signature, secret)) throw new Error('Invalid Razorpay signature');
  return activateCapturedPayment({ orderId, paymentId, expectedUserId: userId });
}

async function markFailed(orderId, paymentId, reason) {
  if (!validString(orderId) && !validString(paymentId)) return;
  const filter = { status: { $ne: 'CAPTURED' } };
  if (orderId && paymentId) {
    filter.$or = [{ razorpayOrderId: orderId }, { razorpayPaymentId: paymentId }];
  } else if (orderId) {
    filter.razorpayOrderId = orderId;
  } else {
    filter.razorpayPaymentId = paymentId;
  }
  const payment = await Payment.findOneAndUpdate(
    filter,
    { status: 'FAILED', ...(paymentId ? { razorpayPaymentId: paymentId } : {}), failureReason: reason || 'Payment failed' },
    { returnDocument: 'after' },
  );
  if (payment) {
    await Subscription.updateOne(
      { userId: payment.userId, paymentId: payment._id.toString(), status: 'PENDING' },
      { status: 'PAYMENT FAILED' }
    );
  }
}

async function markRefunded(paymentId) {
  if (!validString(paymentId)) return;
  await Payment.findOneAndUpdate({ razorpayPaymentId: paymentId }, { status: 'REFUNDED' });
}

async function handleWebhook(rawBody, signature) {
  const secret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim();
  if (!secret) throw new Error('Razorpay webhook secret is not configured in environment');
  if (!verifyHmac(rawBody, signature, secret)) throw new Error('Invalid webhook signature');
  const payload = JSON.parse(rawBody.toString('utf8'));
  const event = payload?.event;
  const eventId = payload?.payload?.payment?.entity?.id || payload?.payload?.order?.entity?.id;
  if (!event || !eventId) throw new Error('Webhook event identifier missing');
  const processedEventId = `${event}:${eventId}`;

  try {
    await WebhookEvent.create({
      eventId: processedEventId,
      event,
      razorpayOrderId: payload?.payload?.payment?.entity?.order_id || payload?.payload?.order?.entity?.id || null,
      razorpayPaymentId: payload?.payload?.payment?.entity?.id || null,
    });
  } catch (error) {
    if (error.code === 11000) return { duplicate: true };
    throw error;
  }

  try {
    let payment = payload?.payload?.payment?.entity;
    if (payload.event === 'order.paid' && !payment?.id) {
      const orderId = payload?.payload?.order?.entity?.id;
      const client = getRazorpayClient();
      const paymentList = await client.orders.fetchPayments(orderId);
      payment = paymentList.items?.find((item) => item.status === 'captured') || paymentList.items?.[0];
    }
    if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
      if (!payment?.id || !payment?.order_id) throw new Error('Webhook payment details missing');
      await activateCapturedPayment({ orderId: payment.order_id, paymentId: payment.id, paymentEntity: payment });
    } else if (payload.event === 'payment.failed') {
      await markFailed(payment?.order_id, payment?.id, payment?.error_description || payment?.error_reason);
    } else if (payload.event === 'payment.refunded') {
      await markRefunded(payment?.id);
    }
  } catch (error) {
    await WebhookEvent.deleteOne({ eventId: processedEventId });
    throw error;
  }
  return { duplicate: false };
}

module.exports = { createOrder, verifyPayment, handleWebhook, markFailed, markRefunded, getRazorpayClient };
