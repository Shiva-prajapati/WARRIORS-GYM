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

function getPlanEmoji(name, index) {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('beginner')) return '💪';
  if (lower.includes('advance')) return '🔥';
  if (lower.includes('high')) return '⚡';
  if (lower.includes('pro')) return '👑';
  const fallbacks = ['💪', '🔥', '⚡', '👑', '🏋️', '⭐', '🥇', '🚀'];
  return fallbacks[index % fallbacks.length];
}

function buildReminderMessage({ memberName, planName, expiryDate, isExpired, activePlans = [] }) {
  const statusLine = isExpired
    ? 'Your membership has expired.'
    : 'Your membership is ending soon.';

  const lines = [
    '🏋️ WARRIORS GYM — MEMBERSHIP RENEWAL',
    '',
    `Hello ${memberName} 👋`,
    '',
    statusLine,
    '',
    `📅 Current Plan: ${planName || 'Warriors Gym'}`,
    `⏳ Valid Until: ${expiryDate || 'N/A'}`,
    '',
    'Choose any active plan:',
  ];

  if (activePlans.length > 0) {
    activePlans.forEach((p, index) => {
      lines.push('');
      const emoji = getPlanEmoji(p.name, index);
      const planUpper = String(p.name || '').toUpperCase();
      lines.push(`${emoji} ${planUpper} — ${formatINR(p.price)}`);
      lines.push(`👉 Pay ${p.name}: ${p.paymentLink || ''}`);
    });
  }

  lines.push('');
  lines.push('💳 Secure payment powered by Razorpay.');

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

  const defaultClientUrl = process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? 'https://warriors-gym-iota.vercel.app' : 'http://localhost:5173');
  const cleanBaseUrl = String(baseUrl || defaultClientUrl).replace(/\/+$/, '');

  // Generate dedicated authenticated renewal JWT link for EACH active MongoDB plan
  const activePlansWithLinks = activePlans.map((p) => {
    const planToken = jwt.sign(
      {
        userId: String(member._id),
        planId: String(p._id),
        action: 'renew',
      },
      process.env.JWT_SECRET,
      { expiresIn: '14d' }
    );
    const paymentLink = `${cleanBaseUrl}/?renew=${encodeURIComponent(planToken)}`;
    return {
      ...p,
      paymentLink,
    };
  });

  const message = buildReminderMessage({
    memberName,
    planName,
    expiryDate,
    isExpired,
    activePlans: activePlansWithLinks,
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
      activePlanCount: activePlansWithLinks.length,
      planLinks: activePlansWithLinks.map((p) => ({ planName: p.name, price: p.price, url: p.paymentLink })),
    },
    triggeredBy: String(triggeredBy),
  });

  return {
    success: true,
    configured: true,
    provider: 'WHATSAPP_WEB',
    waUrl,
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

