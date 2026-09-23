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
  lines.push('Choose your plan and pay securely:');
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

  // Sign a secure 14-day renewal JWT for direct authenticated renewal (allows selecting ANY active plan)
  const renewalToken = jwt.sign(
    {
      userId: String(member._id),
      action: 'renew',
    },
    process.env.JWT_SECRET,
    { expiresIn: '14d' }
  );

  const defaultClientUrl = process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? 'https://warriors-gym-iota.vercel.app' : 'http://localhost:5173');
  const cleanBaseUrl = String(baseUrl || defaultClientUrl).replace(/\/+$/, '');
  const directRenewalUrl = `${cleanBaseUrl}/?renew=${encodeURIComponent(renewalToken)}`;
  const paymentLink = directRenewalUrl;
  const razorpayPaymentLinkId = null;

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

function buildWelcomeMessage({ memberName, phone, planName, startDate, endDate, password }) {
  const pwdDisplay = password || '[As set during registration]';
  const lines = [
    '🎉 WELCOME TO WARRIORS GYM! 💪',
    '',
    `Congratulations, ${memberName}! 🔥`,
    '',
    'Your Warriors Gym membership is now ACTIVE.',
    '',
    `🏋️ Your Plan: ${planName || 'WARRIORS MEMBERSHIP'}`,
    `📅 Start Date: ${startDate || 'N/A'}`,
    `⏳ Valid Until: ${endDate || 'N/A'}`,
    '',
    '🔐 YOUR LOGIN DETAILS',
    '',
    `ID: ${phone}`,
    `Password: ${pwdDisplay}`,
    '',
    '🌐 LOGIN TO YOUR WARRIORS GYM PORTAL:',
    'https://warriors-gym-iota.vercel.app/',
    '',
    '👉 Open the website',
    '👉 Click "Join Warriors" / Login',
    '👉 Enter your ID and Password',
    '👉 Complete your profile',
    '👉 Check your membership and workout plan',
    '👉 Enjoy your Warriors Gym portal! 🚀',
    '',
    'If you have any problem while logging in, contact Warriors Gym.',
    '',
    '🔥 TRAIN HARD',
    '💪 STAY CONSISTENT',
    '🏆 BECOME A WARRIOR',
    '',
    'Welcome to WARRIORS GYM! ❤️',
  ];
  return lines.join('\n');
}

async function sendWelcome({ member, subscription, plan, password, triggeredBy }) {
  const memberName = member.name || 'Member';
  const recipientPhone = formatPhoneForWhatsApp(member.phone);
  if (!recipientPhone || recipientPhone.length < 10) {
    throw new Error(`Member ${memberName} does not have a valid 10-digit mobile number for WhatsApp.`);
  }

  let resolvedPlan = plan;
  if (!resolvedPlan && subscription?.planId) {
    resolvedPlan = await GymPlan.findById(subscription.planId).lean();
  }

  const planName = resolvedPlan?.name || subscription?.planName || 'WARRIORS MEMBERSHIP';

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

  const message = buildWelcomeMessage({
    memberName,
    phone: member.phone,
    planName,
    startDate,
    endDate,
    password,
  });

  const waUrl = `https://wa.me/${recipientPhone}?text=${encodeURIComponent(message)}`;

  await ReminderLog.create({
    memberId: String(member._id),
    recipientPhone,
    message: buildWelcomeMessage({
      memberName,
      phone: member.phone,
      planName,
      startDate,
      endDate,
      password: password ? '********' : null,
    }),
    provider: 'WHATSAPP_WEB',
    status: 'PREPARED',
    providerResponse: {
      waUrl,
      type: 'WELCOME',
      planName,
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

