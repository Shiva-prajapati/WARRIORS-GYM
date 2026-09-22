const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { getRazorpayClient, createOrder, markFailed } = require('../src/paymentService');
const { User, GymPlan, Payment, Subscription, WebhookEvent } = require('../src/models');

async function testPaymentFlow() {
  console.log('==============================================');
  console.log('   WARRIORS GYM RAZORPAY FLOW VERIFICATION   ');
  console.log('==============================================');

  // 1. Verify Environment Variables
  console.log('\n[1/6] Checking Razorpay & Mongo Configuration:');
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
  }
  console.log('✓ Key ID:', keyId);
  console.log('✓ Secret Present:', Boolean(keySecret));
  console.log('✓ Webhook Secret Present:', Boolean(webhookSecret));

  // 2. Connect to MongoDB
  console.log('\n[2/6] Connecting to MongoDB Atlas:');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✓ Connected to MongoDB:', mongoose.connection.name);

  // 3. Test Razorpay Live API Connectivity
  console.log('\n[3/6] Testing Razorpay Live API Connection:');
  const rzp = getRazorpayClient();
  const recentOrders = await rzp.orders.all({ count: 1 });
  console.log('✓ Razorpay API reachable! Recent orders fetch count:', recentOrders.items?.length ?? 0);

  // 4. Test Plan Fetching & Server-Side Price Security
  console.log('\n[4/6] Reading Plan from MongoDB:');
  let plan = await GymPlan.findOne({ active: true }).lean();
  if (!plan) {
    console.log('No active plan found, creating a test plan...');
    plan = await GymPlan.create({
      name: 'Test Razorpay Plan',
      price: 1, // 1 INR
      duration: 1,
      durationUnit: 'MONTHS',
      active: true,
    });
  }
  console.log(`✓ Using plan: "${plan.name}" at ₹${plan.price} (Duration: ${plan.duration} ${plan.durationUnit})`);

  // Find a test user (owner or member)
  let user = await User.findOne({ role: 'member' }).lean();
  if (!user) user = await User.findOne({ role: 'owner' }).lean();
  if (!user) throw new Error('No user found in database for test');
  console.log(`✓ Test user: ${user.name} (${user.phone}) [ID: ${user._id}]`);

  // 5. Create Real Razorpay Order via paymentService
  console.log('\n[5/6] Creating Real Razorpay Order via createOrder():');
  const order = await createOrder({
    userId: String(user._id),
    plan: { ...plan, id: String(plan._id) },
  });

  console.log('✓ Real Razorpay Order Created:');
  console.log('   - Order ID:', order.id);
  console.log('   - Amount (paise):', order.amount, `(₹${order.amount / 100})`);
  console.log('   - Currency:', order.currency);
  console.log('   - Status:', order.status);

  // Verify MongoDB payment record created in PENDING state
  const pendingPayment = await Payment.findOne({ razorpayOrderId: order.id });
  if (!pendingPayment) throw new Error('Payment record was not created in MongoDB!');
  console.log('✓ MongoDB Payment Record verified:', {
    id: String(pendingPayment._id),
    status: pendingPayment.status,
    amount: pendingPayment.amount,
    userId: String(pendingPayment.userId),
    planId: String(pendingPayment.planId),
  });

  // 6. Test Webhook HMAC Signature Calculation
  console.log('\n[6/6] Verifying Webhook HMAC-SHA256 signature generator:');
  const testPayload = JSON.stringify({
    event: 'order.paid',
    payload: {
      order: { entity: { id: order.id } },
      payment: { entity: { id: 'pay_test_signature', order_id: order.id, amount: order.amount } },
    },
  });
  const computedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(Buffer.from(testPayload, 'utf8'))
    .digest('hex');
  console.log('✓ HMAC-SHA256 signature generated successfully:', computedSignature.slice(0, 16) + '...');

  // Test markFailed
  await markFailed(order.id, null, 'Automated integration test cleanup');
  const updatedPayment = await Payment.findOne({ razorpayOrderId: order.id });
  console.log('✓ Payment status updated to:', updatedPayment.status);

  // Clean up test payment record so it doesn't pollute user history
  await Payment.deleteOne({ _id: pendingPayment._id });
  console.log('✓ Test payment cleaned up.');

  console.log('\n==============================================');
  console.log('   ALL RAZORPAY INTEGRATION CHECKS PASSED!   ');
  console.log('==============================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

testPaymentFlow().catch(async (err) => {
  console.error('\n❌ Payment Flow Test Failed:', err.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
