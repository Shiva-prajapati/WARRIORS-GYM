const jwt = require('jsonwebtoken');
const { GymPlan, ReminderLog } = require('./models');

function isConfigured() {
  return true;
}

function formatPhoneForWhatsApp(phone) {
  let cleaned = String(phone || '').replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
}


function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function buildReminderMessage({ memberName, planName, expiryDate, isExpired, paymentLink, activePlans = [] }) {
  const planPrefix = planName || 'Warriors Gym';
  const expiryLine = expiryDate
    ? (isExpired
        ? `Your ${planPrefix} membership expired on ${expiryDate}.`
        : `Your ${planPrefix} membership is expiring on ${expiryDate}.`)
    : `Your ${planPrefix} membership is expiring soon.`;

  const resolvedPaymentLink = paymentLink || '';

  const numberEmoji = ['1\uFE0F\u20E3', '2\uFE0F\u20E3', '3\uFE0F\u20E3', '4\uFE0F\u20E3', '5\uFE0F\u20E3', '6\uFE0F\u20E3', '7\uFE0F\u20E3', '8\uFE0F\u20E3', '9\uFE0F\u20E3', '\uD83D\uDD1F'];
  const planLines = activePlans.length > 0
    ? activePlans.map((p, i) => `${numberEmoji[i] || `${i + 1}.`} ${p.name} \u2014 ${formatINR(p.price)}`)
    : [];

  const lines = [
    '\uD83C\uDFC6 WARRIORS GYM',
    '',
    'MEMBERSHIP RENEWAL REMINDER',
    '',
    `Hi ${memberName},`,
    '',
    expiryLine,
    '',
    "Don't stop your progress. \uD83D\uDCAA",
  ];

  if (planLines.length > 0) {
    lines.push('');
    lines.push('Choose a plan to continue your training:');
    lines.push('');
    lines.push(...planLines);
  }

  lines.push('');
  lines.push('\uD83D\uDCB3 Renew Online:');
  lines.push(resolvedPaymentLink);
  lines.push('');
  lines.push('Once your payment is verified, your membership will be renewed.');
  lines.push('');
  lines.push('Train \u2022 Transform \u2022 Conquer');
  lines.push('');
  lines.push('WARRIORS GYM');

  return lines.join('\n');
}

async function sendReminder({ member, subscription, plan, triggeredBy, baseUrl }) {
  const memberName = member.name || 'Member';

  const recipientPhone = formatPhoneForWhatsApp(member.phone);
  if (!recipientPhone || recipientPhone.length < 10) {
    throw new Error(`Member ${memberName} does not have a valid 10-digit mobile number for WhatsApp.`);
  }

  // Resolve current plan from MongoDB if not passed
  let resolvedPlan = plan;
  if (!resolvedPlan && subscription?.planId) {
    resolvedPlan = await GymPlan.findById(subscription.planId).lean();
  }
  if (!resolvedPlan) {
    resolvedPlan = await GymPlan.findOne({ active: true }).sort({ price: 1 }).lean();
  }

  // Fetch all active plans from MongoDB for the plan list in the message
  const activePlans = await GymPlan.find({ active: true }).sort({ price: 1 }).lean();

  const planName = resolvedPlan?.name || subscription?.planName || 'Warriors Gym';
  const targetPlanId = resolvedPlan ? String(resolvedPlan._id || resolvedPlan.id) : (subscription ? String(subscription.planId) : undefined);

  const isExpired = Boolean(subscription?.endDate && new Date(subscription.endDate) <= new Date());
  const expiryDate = subscription?.endDate
    ? new Date(subscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  // Sign a secure 14-day renewal JWT for direct authenticated renewal
  const renewalToken = jwt.sign(
    {
      userId: String(member._id),
      planId: targetPlanId,
      action: 'renew',
    },
    process.env.JWT_SECRET,
    { expiresIn: '14d' }
  );

  const cleanBaseUrl = String(baseUrl || process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const directRenewalUrl = `${cleanBaseUrl}/?renew=${encodeURIComponent(renewalToken)}`;

  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  let paymentLink = null;
  let razorpayPaymentLinkId = null;

  if (keyId && keySecret && resolvedPlan && Number(resolvedPlan.price) > 0) {
    try {
      const { getRazorpayClient } = require('./paymentService');
      const rzp = getRazorpayClient();
      const plink = await rzp.paymentLink.create({
        amount: Math.round(Number(resolvedPlan.price) * 100),
        currency: resolvedPlan.currency || 'INR',
        accept_partial: false,
        description: `Warriors Gym - ${planName} Renewal`,
        customer: {
          name: memberName,
          contact: recipientPhone,
        },
        notify: { sms: false, email: false },
        reminder_enable: false,
        notes: {
          userId: String(member._id),
          planId: String(targetPlanId),
        },
        callback_url: directRenewalUrl,
        callback_method: 'get',
      });
      if (plink && plink.short_url) {
        paymentLink = plink.short_url;
        razorpayPaymentLinkId = plink.id;
      }
    } catch (err) {
      console.warn('Razorpay payment link API unavailable, using renewal checkout URL:', err.message);
      paymentLink = directRenewalUrl;
    }
  }

  if (!paymentLink) {
    paymentLink = directRenewalUrl;
  }

  const message = buildReminderMessage({ memberName, planName, expiryDate, isExpired, paymentLink, activePlans });
  const waUrl = `https://wa.me/${recipientPhone}?text=${encodeURIComponent(message)}`;

  await ReminderLog.create({
    memberId: String(member._id),
    recipientPhone,
    message,
    provider: 'WHATSAPP_WEB',
    status: 'PREPARED',
    providerResponse: {
      waUrl,
      paymentLink,
      directRenewalUrl,
      razorpayPaymentLinkId,
      planName,
      amount: resolvedPlan?.price || null,
      activePlanCount: activePlans.length,
    },
    triggeredBy: String(triggeredBy),
  });

  return {
    success: true,
    configured: true,
    provider: 'WHATSAPP_WEB',
    waUrl,
    paymentLink,
    directRenewalUrl,
    messageText: message,
    recipientPhone,
    planName,
    message: `WhatsApp renewal reminder prepared for ${memberName}. Press Send in WhatsApp to deliver.`,
  };
}

function buildWelcomeMessage({ memberName, phone, planName, duration, startDate, endDate, loginWebsite }) {
  const website = loginWebsite || 'https://warriors-gym-iota.vercel.app/';
  const lines = [
    '🏋️ *WARRIORS GYM - WELCOME TO THE FAMILY* 🏋️',
    '',
    `Dear *${memberName}*,`,
    '',
    'Congratulations and welcome to *WARRIORS GYM*! We are thrilled to have you train with us. Get ready to train, transform, and conquer your fitness goals! 💪',
    '',
    '📋 *YOUR MEMBERSHIP DETAILS:*',
    `• *Member Name:* ${memberName}`,
    `• *Phone Number:* ${phone}`,
    `• *Active Plan:* ${planName || 'No active plan'}`,
    `• *Plan Duration:* ${duration || 'N/A'}`,
    `• *Start Date:* ${startDate || 'N/A'}`,
    `• *End Date:* ${endDate || 'N/A'}`,
    '',
    '🔐 *MEMBER PORTAL LOGIN:*',
    `• *Login ID:* ${phone}`,
    `• *Website:* ${website}`,
    '',
    'Log in to track your workouts, view your diet plans, check payment receipts, and stay updated.',
    '',
    'Train hard, stay consistent, and unleash the warrior within! 🔥',
    '',
    '*WARRIORS GYM*',
  ];
  return lines.join('\n');
}

async function sendWelcome({ member, subscription, plan, triggeredBy }) {
  const memberName = member.name || 'Member';
  const recipientPhone = formatPhoneForWhatsApp(member.phone);
  if (!recipientPhone || recipientPhone.length < 10) {
    throw new Error(`Member ${memberName} does not have a valid 10-digit mobile number for WhatsApp.`);
  }

  let resolvedPlan = plan;
  if (!resolvedPlan && subscription?.planId) {
    resolvedPlan = await GymPlan.findById(subscription.planId).lean();
  }

  const planName = resolvedPlan?.name || subscription?.planName || 'No active plan';
  let duration = 'N/A';
  if (resolvedPlan?.duration) {
    const unit = (resolvedPlan.durationUnit || 'MONTHS').toLowerCase();
    duration = `${resolvedPlan.duration} ${unit}`;
  }

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  const startDate = formatDate(subscription?.startDate);
  const endDate = formatDate(subscription?.endDate);
  const loginWebsite = 'https://warriors-gym-iota.vercel.app/';

  const message = buildWelcomeMessage({
    memberName,
    phone: member.phone,
    planName,
    duration,
    startDate,
    endDate,
    loginWebsite,
  });

  const waUrl = `https://wa.me/${recipientPhone}?text=${encodeURIComponent(message)}`;

  await ReminderLog.create({
    memberId: String(member._id),
    recipientPhone,
    message,
    provider: 'WHATSAPP_WEB',
    status: 'PREPARED',
    providerResponse: {
      waUrl,
      type: 'WELCOME',
      planName,
      duration,
      startDate,
      endDate,
    },
    triggeredBy: String(triggeredBy || member._id),
  }).catch(() => {});

  return {
    success: true,
    configured: true,
    provider: 'WHATSAPP_WEB',
    waUrl,
    messageText: message,
    recipientPhone,
    message: `WhatsApp welcome message prepared for ${memberName}. Press Send in WhatsApp to deliver.`,
  };
}

module.exports = {
  isConfigured,
  formatPhoneForWhatsApp,
  buildReminderMessage,
  sendReminder,
  buildWelcomeMessage,
  sendWelcome,
};

