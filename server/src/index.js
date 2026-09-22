const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const {
  User,
  GymPlan,
  Payment,
  Subscription,
  Workout,
  WorkoutPlan,
  Diet,
  Notification,
  ReminderLog,
} = require('./models');
const { createOrder, verifyPayment, handleWebhook, markFailed } = require('./paymentService');
const { sendReminder, sendWelcome } = require('./whatsappService');


const clientUrl = process.env.CLIENT_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
const requiredEnvironment = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvironment = requiredEnvironment.filter((name) => !process.env[name]);
if (missingEnvironment.length) {
  console.warn(`Warning: Missing recommended environment variables: ${missingEnvironment.join(', ')}`);
}

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || 'warriors_gym_auth_secret_fallback';
const allowedOrigins = new Set([clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173']);
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.onrender.com') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host.endsWith('.loca.lt') ||
      host.endsWith('.ngrok-free.app') ||
      host.endsWith('.ngrok.io')
    ) {
      return true;
    }
  } catch {}
  return false;
};
const paymentLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, validate: { trustProxy: false } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false, validate: { trustProxy: false } });

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({ origin: (origin, callback) => callback(null, isOriginAllowed(origin)), credentials: true }));

// Razorpay signs the exact raw body. This route must run before express.json().
app.post(['/api/payments/webhook', '/payments/webhook'], express.raw({ type: '*/*', limit: '2mb' }), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDb().catch(() => {});
    }
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      return res.status(400).json({ ok: false, message: 'Missing x-razorpay-signature header' });
    }
    await handleWebhook(req.body, signature);
    res.json({ ok: true, status: 'processed' });
  } catch (error) {
    console.error('Webhook processing error:', error.message);
    const isSignatureError = error.message && error.message.includes('signature');
    res.status(isSignatureError ? 400 : 500).json({
      ok: false,
      message: isSignatureError ? 'Invalid webhook signature' : error.message || 'Webhook processing failed'
    });
  }
});
app.use(express.json({ limit: '5mb' }));

let isConnecting = false;
let lastDbError = null;
async function connectDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGODB_URI) {
    lastDbError = new Error('MONGODB_URI is not set in environment variables');
    console.warn(lastDbError.message);
    return;
  }
  if (isConnecting) return;
  isConnecting = true;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8_000 });
    lastDbError = null;
    console.log('MongoDB connected');
  } catch (error) {
    lastDbError = error;
    console.warn('MongoDB connection failed:', error.message);
  } finally {
    isConnecting = false;
  }
}

// Auto-connect middleware so serverless / Render auto-connects to MongoDB on request
app.use(async (_req, _res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDb();
    } catch (err) {
      console.warn('Database auto-connect attempt failed:', err.message);
    }
  }
  next();
});

// Automatically route requests missing /api prefix (e.g. /auth/login -> /api/auth/login)
app.use((req, _res, next) => {
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

const requireMongo = (_, res, next) => mongoose.connection.readyState === 1
  ? next()
  : res.status(503).json({ message: 'Database unavailable' });

function validateString(value, min, max) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}
function normalizePhone(value) {
  if (typeof value !== 'string') return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}
function validPhone(value) {
  if (typeof value !== 'string') return false;
  const digits = normalizePhone(value);
  return digits.length >= 10 && digits.length <= 15;
}
function validIndianMobile(value) {
  const digits = normalizePhone(value);
  return /^[6-9][0-9]{9}$/.test(digits);
}
function validPassword(value) { return typeof value === 'string' && value.length >= 8 && value.length <= 128; }
function normalizeTime(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const meridiem = match12[3].toUpperCase();
    if (hours < 1 || hours > 12 || parseInt(minutes, 10) > 59) return '';
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    if (hours >= 0 && hours <= 23 && parseInt(minutes, 10) <= 59) {
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
  }
  return trimmed;
}
function validTime(value) {
  if (typeof value !== 'string') return false;
  const normalized = normalizeTime(value);
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(normalized);
}
function validProfilePicture(value) { return value === undefined || (typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(value) && value.length <= 3_000_000); }
function duplicateResponse(error, res) {
  if (error?.code === 11000) return res.status(409).json({ message: 'An account or record with these details already exists' });
  return null;
}
function safeUser(user) {
  const value = user.toObject ? user.toObject() : { ...user };
  delete value.password;
  delete value.passwordHash;
  delete value.__v;
  return { ...value, id: String(value._id), _id: undefined };
}
function planResponse(plan) {
  const value = plan.toObject ? plan.toObject() : { ...plan };
  return { ...value, id: String(value._id), _id: undefined };
}
function subscriptionResponse(subscription, plan) {
  if (!subscription) return null;
  const value = subscription.toObject ? subscription.toObject() : { ...subscription };
  return { ...value, id: String(value._id), _id: undefined, plan: plan ? planResponse(plan) : null };
}
function tokenFor(user) { return jwt.sign({ sub: String(user._id) }, JWT_SECRET, { expiresIn: '7d' }); }

function calculateSubscriptionDates(duration, durationUnit = 'MONTHS', fromDate = new Date()) {
  const startDate = new Date(fromDate);
  const endDate = new Date(startDate);
  const unit = String(durationUnit || 'MONTHS').toUpperCase();

  if (unit === 'DAYS') {
    endDate.setDate(endDate.getDate() + Number(duration));
  } else if (unit === 'YEARS') {
    endDate.setFullYear(endDate.getFullYear() + Number(duration));
  } else {
    // Default MONTHS
    endDate.setMonth(endDate.getMonth() + Number(duration));
  }
  return { startDate, endDate };
}

async function generateExpiryNotifications(ownerId) {
  try {
    const activeSubs = await Subscription.find({ status: { $in: ['ACTIVE', 'EXPIRED'] } });
    const now = new Date();

    for (const sub of activeSubs) {
      const member = await User.findById(sub.userId);
      if (!member) {
        // Clean up orphaned notifications if member no longer exists
        await Notification.deleteMany({ subscriptionId: String(sub._id) });
        continue;
      }
      const plan = await GymPlan.findById(sub.planId);
      const planName = plan?.name || 'Membership';

      if (!sub.endDate) continue;
      const expiryDateStr = new Date(sub.endDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      const diffMs = new Date(sub.endDate) - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 3) {
        // If subscription is now extended beyond 3 days, remove pending expiry alerts
        await Notification.deleteMany({
          subscriptionId: String(sub._id),
          type: { $in: ['EXPIRED', 'EXPIRY_1_DAY', 'EXPIRY_3_DAYS'] },
        });
        continue;
      }

      let type = null;
      let title = '';
      let message = '';

      if (diffDays <= 0) {
        type = 'EXPIRED';
        title = 'Membership Expired';
        message = `${member.name}'s ${planName} membership expired on ${expiryDateStr}.`;
        if (sub.status === 'ACTIVE') {
          await Subscription.updateOne({ _id: sub._id }, { status: 'EXPIRED' });
        }
        // Remove pre-expiry notices so only the expired alert remains
        await Notification.deleteMany({
          subscriptionId: String(sub._id),
          type: { $in: ['EXPIRY_1_DAY', 'EXPIRY_3_DAYS'] },
        });
      } else if (diffDays === 1) {
        type = 'EXPIRY_1_DAY';
        title = 'Expiring Tomorrow';
        message = `${member.name}'s ${planName} membership expires tomorrow on ${expiryDateStr}.`;
        await Notification.deleteMany({ subscriptionId: String(sub._id), type: { $in: ['EXPIRED', 'EXPIRY_3_DAYS'] } });
      } else if (diffDays <= 3) {
        type = 'EXPIRY_3_DAYS';
        title = `Expiring in ${diffDays} Days`;
        message = `${member.name}'s ${planName} membership expires on ${expiryDateStr} (in ${diffDays} days).`;
        await Notification.deleteMany({ subscriptionId: String(sub._id), type: 'EXPIRED' });
      }

      if (type) {
        // Upsert by subscriptionId and type: guarantees NO duplicates on refresh and auto-updates message/dates
        await Notification.findOneAndUpdate(
          { subscriptionId: String(sub._id), type },
          {
            $set: {
              userId: ownerId || sub.userId,
              memberId: String(member._id),
              title,
              message,
              daysRemaining: Math.max(0, diffDays),
            },
            $setOnInsert: {
              read: false,
            },
          },
          { upsert: true, returnDocument: 'after' },
        );
      }
    }
  } catch (err) {
    console.error('Error generating notifications:', err.message);
  }
}

async function auth(req, res, next) {
  try {
    const rawToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const claims = jwt.verify(rawToken, JWT_SECRET);
    if (!mongoose.isValidObjectId(claims.sub)) return res.status(401).json({ message: 'Authentication required' });
    const user = await User.findOne({ _id: claims.sub, isActive: true });
    if (!user) return res.status(401).json({ message: 'Authentication required' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Authentication required' });
  }
}
function ownerOnly(req, res, next) {
  if (req.user.role !== 'owner') return res.status(403).json({ message: 'Owner access required' });
  next();
}
function explicitOwnerSetup(req, res, next) {
  const supplied = req.headers['x-owner-setup-token'];
  if (!process.env.OWNER_SETUP_TOKEN || !supplied) return res.status(404).json({ message: 'Owner setup is unavailable' });
  const expected = Buffer.from(process.env.OWNER_SETUP_TOKEN);
  const actual = Buffer.from(String(supplied));
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return res.status(403).json({ message: 'Invalid owner setup authorization' });
  next();
}

app.get('/api/health', async (_, res) => {
  if (mongoose.connection.readyState !== 1) {
    await connectDb().catch(() => {});
  }
  res.json({
    ok: mongoose.connection.readyState === 1,
    service: 'warriors-gym-api',
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    mongoState: mongoose.connection.readyState === 1 ? 'CONNECTED' : (mongoose.connection.readyState === 2 ? 'CONNECTING' : 'DISCONNECTED'),
    hasRazorpayKey: Boolean(process.env.RAZORPAY_KEY_ID),
    hasRazorpaySecret: Boolean(process.env.RAZORPAY_KEY_SECRET),
    hasRazorpayWebhookSecret: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    dbError: lastDbError ? lastDbError.message : null,
  });
});
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { name, phone, password, email, village, profilePicture, dateOfBirth, gender, experience } = req.body || {};
  if (!validateString(name, 2, 100) || !validPhone(phone) || !validPassword(password)) return res.status(400).json({ message: 'Name, phone and password are required and valid' });
  try {
    const cleanPhone = normalizePhone(phone) || phone.trim();
    const user = await User.create({ name: name.trim(), phone: cleanPhone, passwordHash: await bcrypt.hash(password, 12), email, village: typeof village === 'string' ? village.trim() : undefined, profilePicture, dateOfBirth, gender, experience, role: 'member' });
    res.status(201).json({ user: safeUser(user), token: tokenFor(user) });
  } catch (error) {
    if (duplicateResponse(error, res)) return;
    res.status(400).json({ message: 'Registration data is invalid' });
  }
});
app.post('/api/auth/setup-owner', authLimiter, explicitOwnerSetup, async (req, res) => {
  if (await User.exists({ role: 'owner' })) return res.status(409).json({ message: 'Owner setup has already been completed' });
  const { name, phone, password, email } = req.body || {};
  if (!validateString(name, 2, 100) || !validPhone(phone) || !validPassword(password)) return res.status(400).json({ message: 'Name, phone and password are required and valid' });
  try {
    const owner = await User.create({ name: name.trim(), phone: phone.trim(), email, passwordHash: await bcrypt.hash(password, 12), role: 'owner' });
    res.status(201).json({ user: safeUser(owner), token: tokenFor(owner) });
  } catch (error) {
    if (duplicateResponse(error, res)) return;
    res.status(400).json({ message: 'Owner data is invalid' });
  }
});
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { phone, password } = req.body || {};
  if (!validPhone(phone) || typeof password !== 'string') return res.status(401).json({ message: 'Invalid phone number or password' });
  const raw = phone.trim();
  const normalized = normalizePhone(raw);
  const candidates = [...new Set([raw, normalized, '+91' + normalized, '+91 ' + normalized, '0' + normalized].filter(Boolean))];
  const user = await User.findOne({ phone: { $in: candidates }, isActive: true }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: 'Invalid phone number or password' });
  res.json({ user: safeUser(user), token: tokenFor(user) });
});
app.post('/api/auth/change-password', auth, authLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!validPassword(currentPassword) || !validPassword(newPassword)) return res.status(400).json({ message: 'Passwords must be at least 8 characters' });
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ message: 'Current password is incorrect' });
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  res.json({ user: safeUser(user) });
});
app.get('/api/auth/me', auth, (req, res) => res.json({ user: safeUser(req.user) }));
app.put('/api/auth/profile', auth, async (req, res) => {
  const allowedFields = ['name', 'phone', 'email', 'village', 'profilePicture', 'dateOfBirth', 'gender', 'experience'];
  const submittedFields = Object.keys(req.body || {});
  const invalidFields = submittedFields.filter((field) => !allowedFields.includes(field));
  if (invalidFields.length) return res.status(400).json({ message: `Unsupported profile fields: ${invalidFields.join(', ')}` });
  const updates = { ...req.body };
  if (updates.name !== undefined && !validateString(updates.name, 2, 100)) return res.status(400).json({ message: 'Name is invalid' });
  if (updates.phone !== undefined && !validPhone(updates.phone)) return res.status(400).json({ message: 'Phone number is invalid' });
  if (updates.email === '') updates.email = undefined;
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    res.json({ user: safeUser(user) });
  } catch (error) {
    if (duplicateResponse(error, res)) return;
    res.status(400).json({ message: 'Profile data is invalid' });
  }
});

app.get('/api/auth/renew-session', async (req, res) => {
  const token = req.query.token;
  if (typeof token !== 'string' || !token) {
    return res.status(400).json({ message: 'Renewal token is required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.userId || decoded.action !== 'renew') {
      return res.status(401).json({ message: 'Invalid renewal token' });
    }
    const user = await User.findOne({ _id: decoded.userId, isActive: true });
    if (!user) return res.status(404).json({ message: 'Member not found or inactive' });

    res.json({
      user: safeUser(user),
      token: tokenFor(user),
      planId: decoded.planId || null,
    });
  } catch (error) {
    res.status(401).json({ message: 'Renewal link has expired or is invalid' });
  }
});

app.get('/api/plans', async (_, res) => {
  const plans = await GymPlan.find({ active: true }).sort({ price: 1 });
  res.json({ plans: plans.map(planResponse) });
});

app.get('/api/admin/plans', auth, ownerOnly, async (_, res) => {
  const plans = await GymPlan.find().sort({ price: 1 });
  res.json({ plans: plans.map(planResponse) });
});

app.post('/api/plans', auth, ownerOnly, async (req, res) => {
  const { name, description = '', duration, durationUnit = 'MONTHS', price, features = [], currency = 'INR' } = req.body || {};
  if (!validateString(name, 2, 120) || !Number.isInteger(Number(duration)) || Number(duration) < 1 || !Number.isSafeInteger(Number(price)) || Number(price) < 1 || currency !== 'INR' || !Array.isArray(features)) {
    return res.status(400).json({ message: 'Invalid plan data. Enter valid name, duration, and price.' });
  }
  const plan = await GymPlan.create({
    name: name.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    duration: Number(duration),
    durationUnit: ['MONTHS', 'DAYS', 'YEARS'].includes(durationUnit) ? durationUnit : 'MONTHS',
    price: Number(price),
    features: features.map((f) => String(f).trim()).filter(Boolean),
    currency,
    active: true,
  });
  res.status(201).json({ plan: planResponse(plan) });
});

app.put('/api/plans/:id', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid plan ID' });
  const allowed = ['name', 'description', 'duration', 'durationUnit', 'price', 'features', 'active'];
  if (Object.keys(req.body || {}).some((field) => !allowed.includes(field))) {
    return res.status(400).json({ message: 'Unsupported plan fields' });
  }
  const updates = { ...req.body };
  if (updates.name !== undefined) updates.name = String(updates.name).trim();
  if (updates.description !== undefined) updates.description = String(updates.description).trim();
  if (updates.duration !== undefined) updates.duration = Number(updates.duration);
  if (updates.price !== undefined) updates.price = Number(updates.price);
  if (updates.features !== undefined && Array.isArray(updates.features)) {
    updates.features = updates.features.map((f) => String(f).trim()).filter(Boolean);
  }
  const plan = await GymPlan.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  res.json({ plan: planResponse(plan) });
});

app.delete('/api/plans/:id', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid plan ID' });
  const plan = await GymPlan.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  res.json({ ok: true, message: 'Plan deactivated successfully' });
});

app.post('/api/memberships/purchase', auth, (_, res) => res.status(410).json({ message: 'Use the secure Razorpay payment flow' }));
app.post('/api/memberships/:id/renew', auth, (_, res) => res.status(410).json({ message: 'Use the secure Razorpay payment flow' }));

app.post('/api/payments/orders', auth, requireMongo, paymentLimiter, async (req, res) => {
  try {
    if (typeof req.body?.planId !== 'string' || Object.keys(req.body).some((key) => key !== 'planId') || !mongoose.isValidObjectId(req.body.planId)) {
      return res.status(400).json({ message: 'Only a valid plan ID is accepted' });
    }
    const plan = await GymPlan.findOne({ _id: req.body.planId, active: true }).lean();
    if (!plan) return res.status(404).json({ message: 'Plan unavailable' });
    const order = await createOrder({ userId: String(req.user._id), plan: { ...plan, id: String(plan._id) } });
    res.status(201).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: (process.env.RAZORPAY_KEY_ID || '').trim(),
      planName: plan.name,
      planPrice: plan.price,
    });
  } catch (error) {
    const isConfigError = error.message && error.message.includes('Razorpay is not configured');
    res.status(isConfigError ? 503 : 502).json({ message: error.message || 'Unable to create payment order' });
  }
});

app.post('/api/payments/verify', auth, requireMongo, paymentLimiter, async (req, res) => {
  try {
    const { razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: signature } = req.body || {};
    if (![paymentId, orderId, signature].every((value) => typeof value === 'string' && value.length > 0)) {
      return res.status(400).json({ message: 'Incomplete payment verification details' });
    }
    const result = await verifyPayment({ userId: String(req.user._id), orderId, paymentId, signature });
    res.json({ status: result.payment.status, alreadyProcessed: result.alreadyProcessed });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/payments/fail', auth, requireMongo, async (req, res) => {
  try {
    const { orderId, paymentId, reason } = req.body || {};
    if (!orderId && !paymentId) {
      return res.status(400).json({ message: 'Order ID or Payment ID is required' });
    }
    const payment = await markFailed(orderId, paymentId, reason || 'Payment failed on checkout');
    res.json({ ok: true, status: payment ? payment.status : 'FAILED' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Unable to record payment failure' });
  }
});

app.get('/api/payments/my-payments', auth, requireMongo, async (req, res) => {
  const records = await Payment.find({ userId: String(req.user._id) }).sort({ createdAt: -1 }).lean();
  res.json({ payments: records.map((payment) => ({ ...payment, id: String(payment._id) })) });
});

app.get('/api/subscription/me', auth, requireMongo, async (req, res) => {
  const subscription = await Subscription.findOne({ userId: String(req.user._id) }).lean();
  if (!subscription) return res.json({ subscription: null });
  if (subscription.status === 'ACTIVE' && new Date(subscription.endDate) < new Date()) {
    await Subscription.updateOne({ _id: subscription._id }, { status: 'EXPIRED' });
    subscription.status = 'EXPIRED';
  }
  const plan = await GymPlan.findById(subscription.planId).lean();
  res.json({ subscription: subscriptionResponse(subscription, plan) });
});

app.get('/api/memberships', auth, async (req, res) => {
  const subscription = await Subscription.findOne({ userId: String(req.user._id) }).lean();
  const plan = subscription ? await GymPlan.findById(subscription.planId).lean() : null;
  res.json({ memberships: subscription ? [subscriptionResponse(subscription, plan)] : [] });
});

app.get('/api/payments', auth, ownerOnly, async (_, res) => {
  const records = await Payment.find().sort({ createdAt: -1 }).lean();
  const memberIds = [...new Set(records.map((payment) => payment.userId))];
  const members = await User.find({ _id: { $in: memberIds } });
  const planIds = [...new Set(records.map((payment) => payment.planId))];
  const plans = await GymPlan.find({ _id: { $in: planIds } }).lean();
  const memberMap = new Map(members.map((member) => [String(member._id), safeUser(member)]));
  const planMap = new Map(plans.map((plan) => [String(plan._id), planResponse(plan)]));
  res.json({
    payments: records.map((payment) => ({
      ...payment,
      id: String(payment._id),
      member: memberMap.get(payment.userId) || null,
      plan: planMap.get(payment.planId) || null,
    })),
  });
});




app.get('/api/workout-plan/me', auth, async (req, res) => {
  const plan = await WorkoutPlan.findOne({ memberId: String(req.user._id) }).lean();
  res.json({ plan: plan ? { ...plan, id: String(plan._id) } : null });
});

app.get('/api/members/:id/workout-plan', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid member ID' });
  const plan = await WorkoutPlan.findOne({ memberId: req.params.id }).lean();
  res.json({ plan: plan ? { ...plan, id: String(plan._id) } : null });
});

app.put('/api/members/:id/workout-plan', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid member ID' });
  const { days = [] } = req.body || {};
  if (!Array.isArray(days)) return res.status(400).json({ message: 'Days array is required' });

  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const formattedDays = days
    .filter((d) => d && validDays.includes(d.day))
    .map((d) => ({
      day: d.day,
      title: typeof d.title === 'string' ? d.title.trim() : '',
      muscleGroup: typeof d.muscleGroup === 'string' ? d.muscleGroup.trim() : '',
      exercises: Array.isArray(d.exercises) ? d.exercises.map((e) => ({
        name: typeof e.name === 'string' ? e.name.trim() : 'Exercise',
        sets: Number(e.sets) || 3,
        reps: typeof e.reps === 'string' || typeof e.reps === 'number' ? String(e.reps) : '10',
        weight: typeof e.weight === 'string' ? e.weight.trim() : '',
        rest: typeof e.rest === 'string' ? e.rest.trim() : '',
        notes: typeof e.notes === 'string' ? e.notes.trim() : '',
      })) : [],
    }));

  const plan = await WorkoutPlan.findOneAndUpdate(
    { memberId: req.params.id },
    {
      ownerId: String(req.user._id),
      weekStartDate: new Date(),
      days: formattedDays,
    },
    { upsert: true, new: true, runValidators: true },
  );

  res.json({ plan: { ...plan.toObject(), id: String(plan._id) } });
});

app.get('/api/admin/notifications', auth, ownerOnly, async (req, res) => {
  await generateExpiryNotifications(String(req.user._id));
  const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50).lean();
  const memberIds = [...new Set(notifications.map((n) => n.memberId))];
  const members = await User.find({ _id: { $in: memberIds } });
  const memberMap = new Map(members.map((m) => [String(m._id), safeUser(m)]));

  const subIds = [...new Set(notifications.map((n) => n.subscriptionId).filter(Boolean))];
  const subs = await Subscription.find({ _id: { $in: subIds } }).lean();
  const subMap = new Map(subs.map((s) => [String(s._id), s]));

  const planIds = [...new Set(subs.map((s) => s.planId))];
  const plans = await GymPlan.find({ _id: { $in: planIds } }).lean();
  const planMap = new Map(plans.map((p) => [String(p._id), planResponse(p)]));

  res.json({
    notifications: notifications.map((n) => {
      const sub = subMap.get(n.subscriptionId);
      return {
        ...n,
        id: String(n._id),
        member: memberMap.get(n.memberId) || null,
        plan: sub ? planMap.get(sub.planId) || null : null,
      };
    }),
  });
});

app.put('/api/admin/notifications/:id/read', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notification ID' });
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.json({ ok: true });
});

app.post('/api/members/:id/send-reminder', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid member ID' });
  const member = await User.findOne({ _id: req.params.id, role: 'member' });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  const subscription = await Subscription.findOne({ userId: String(member._id) }).lean();
  const plan = subscription ? await GymPlan.findById(subscription.planId).lean() : null;

  const clientOrigin = req.headers.origin || req.headers.referer;
  let baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  if (clientOrigin) {
    try {
      const parsed = new URL(clientOrigin);
      baseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch {}
  }

  try {
    const result = await sendReminder({
      member,
      subscription,
      plan,
      triggeredBy: String(req.user._id),
      baseUrl,
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/members/:id/send-welcome', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid member ID' });
  const member = await User.findOne({ _id: req.params.id, role: 'member' });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  const subscription = await Subscription.findOne({ userId: String(member._id) }).lean();
  const plan = subscription ? await GymPlan.findById(subscription.planId).lean() : null;

  try {
    const result = await sendWelcome({
      member,
      subscription,
      plan,
      triggeredBy: String(req.user._id),
    });
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/admin/notifications/:id/send-reminder', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notification ID' });
  const notification = await Notification.findById(req.params.id);
  if (!notification) return res.status(404).json({ message: 'Notification not found' });

  const member = await User.findById(notification.memberId);
  if (!member) return res.status(404).json({ message: 'Member not found' });

  const subscription = notification.subscriptionId ? await Subscription.findById(notification.subscriptionId).lean() : null;
  const plan = subscription ? await GymPlan.findById(subscription.planId).lean() : null;

  const clientOrigin = req.headers.origin || req.headers.referer;
  let baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  if (clientOrigin) {
    try {
      const parsed = new URL(clientOrigin);
      baseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch {}
  }

  try {
    const result = await sendReminder({
      member,
      subscription,
      plan,
      triggeredBy: String(req.user._id),
      baseUrl,
    });

    notification.reminderSentAt = new Date();
    notification.reminderStatus = 'OPENED_IN_WHATSAPP';
    await notification.save();

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/members', auth, ownerOnly, async (req, res) => {
  const allowedFields = ['name', 'phone', 'password', 'village', 'profilePicture', 'experience', 'isActive', 'planId', 'paymentMethod', 'notes', 'startDate', 'endDate'];
  if (Object.keys(req.body || {}).some((field) => !allowedFields.includes(field))) {
    return res.status(400).json({ message: 'Unsupported member fields' });
  }
  const {
    name,
    phone,
    password,
    village,
    profilePicture,
    experience = 'BEGINNER',
    isActive = true,
    planId,
    paymentMethod = 'CASH',
    notes,
    startDate: customStartDate,
    endDate: customEndDate,
  } = req.body || {};

  if (!validateString(name, 2, 100) || !validPhone(phone) || !validPassword(password) || !['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(experience) || typeof isActive !== 'boolean' || !validProfilePicture(profilePicture)) {
    return res.status(400).json({ message: 'Enter valid member details (name, 10-digit mobile number, and password of at least 8 characters)' });
  }

  const cleanPhone = normalizePhone(phone) || phone.trim();
  const existing = await User.findOne({
    $or: [{ phone: cleanPhone }, { phone: phone.trim() }, { phone: '+91' + cleanPhone }],
  });
  if (existing) {
    return res.status(409).json({ message: 'A member with this phone number already exists' });
  }

  let plan = null;
  let startDate = null;
  let endDate = null;
  if (planId) {
    if (!mongoose.isValidObjectId(planId)) return res.status(400).json({ message: 'Invalid plan ID' });
    plan = await GymPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Selected plan not found' });

    if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid start or end date format' });
      }
      if (endDate <= startDate) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }
    } else if (customStartDate) {
      const fromDate = new Date(customStartDate);
      if (isNaN(fromDate.getTime())) return res.status(400).json({ message: 'Invalid start date format' });
      const auto = calculateSubscriptionDates(plan.duration, plan.durationUnit, fromDate);
      startDate = auto.startDate;
      endDate = auto.endDate;
    } else {
      const auto = calculateSubscriptionDates(plan.duration, plan.durationUnit);
      startDate = auto.startDate;
      endDate = auto.endDate;
    }
  }

  try {
    const member = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      passwordHash: await bcrypt.hash(password, 12),
      village: typeof village === 'string' ? village.trim() : undefined,
      profilePicture,
      experience,
      isActive,
      role: 'member',
    });

    let subscription = null;
    let payment = null;

    if (plan) {

      if (paymentMethod === 'CASH') {
        payment = await Payment.create({
          userId: String(member._id),
          planId: String(plan._id),
          amount: plan.price,
          currency: 'INR',
          status: 'CAPTURED',
          paymentMethod: 'CASH',
          notes: typeof notes === 'string' && notes.trim() ? notes.trim() : 'Cash payment confirmed by owner',
          activatedAt: new Date(),
        });

        subscription = await Subscription.create({
          userId: String(member._id),
          planId: String(plan._id),
          startDate,
          endDate,
          status: 'ACTIVE',
          paymentId: String(payment._id),
          paymentMethod: 'CASH',
          amount: plan.price,
          notes: typeof notes === 'string' ? notes.trim() : null,
        });
      } else {
        subscription = await Subscription.create({
          userId: String(member._id),
          planId: String(plan._id),
          startDate,
          endDate,
          status: 'PENDING',
          paymentId: 'PENDING_ONLINE',
          paymentMethod: 'ONLINE',
          amount: plan.price,
          notes: typeof notes === 'string' ? notes.trim() : null,
        });
      }
    }

    res.status(201).json({
      member: safeUser(member),
      membership: subscription ? { ...subscription.toObject(), id: String(subscription._id), plan: planResponse(plan) } : null,
      payment: payment ? { ...payment.toObject(), id: String(payment._id) } : null,
    });
  } catch (error) {
    if (duplicateResponse(error, res)) return;
    res.status(400).json({ message: 'Member creation failed: ' + error.message });
  }
});

app.post('/api/members/:id/subscription/cash', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid member ID' });
  const { planId, startDate: rawStart, endDate: rawEnd } = req.body || {};
  if (!mongoose.isValidObjectId(planId)) return res.status(400).json({ message: 'Valid plan ID is required' });

  const member = await User.findOne({ _id: req.params.id, role: 'member' });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  const plan = await GymPlan.findById(planId);
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  let startDate, endDate;

  if (rawStart && rawEnd) {
    // Owner explicitly chose both dates — use them directly.
    startDate = new Date(rawStart);
    endDate = new Date(rawEnd);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: 'Invalid start or end date format' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
  } else if (rawStart) {
    // Only start date provided — auto-calculate end date from plan duration.
    const fromDate = new Date(rawStart);
    if (isNaN(fromDate.getTime())) return res.status(400).json({ message: 'Invalid start date format' });
    const auto = calculateSubscriptionDates(plan.duration, plan.durationUnit, fromDate);
    startDate = auto.startDate;
    endDate = auto.endDate;
  } else {
    // No dates provided — auto-calculate from today.
    const auto = calculateSubscriptionDates(plan.duration, plan.durationUnit);
    startDate = auto.startDate;
    endDate = auto.endDate;
  }

  const payment = await Payment.create({
    userId: String(member._id),
    planId: String(plan._id),
    amount: plan.price,
    currency: 'INR',
    status: 'CAPTURED',
    paymentMethod: 'CASH',
    notes: 'Cash payment confirmed by owner',
    activatedAt: new Date(),
  });

  const subscription = await Subscription.findOneAndUpdate(
    { userId: String(member._id) },
    {
      planId: String(plan._id),
      planName: plan.name,
      startDate,
      endDate,
      status: 'ACTIVE',
      paymentId: String(payment._id),
      paymentMethod: 'CASH',
      amount: plan.price,
    },
    { upsert: true, new: true },
  );

  res.json({
    subscription: subscriptionResponse(subscription, plan),
    payment: { ...payment.toObject(), id: String(payment._id) },
  });
});

app.get('/api/members', auth, ownerOnly, async (req, res) => {
  await generateExpiryNotifications(String(req.user._id));
  const { q, tab = 'all' } = req.query || {};
  const memberFilter = { role: 'member' };
  if (q && String(q).trim()) {
    const escaped = String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80);
    memberFilter.$or = [
      { name: new RegExp(escaped, 'i') },
      { phone: new RegExp(escaped, 'i') },
    ];
  }
  const members = await User.find(memberFilter).sort({ createdAt: -1 });
  const memberIds = members.map((member) => String(member._id));
  const subscriptions = await Subscription.find({ userId: { $in: memberIds } }).lean();
  const planIds = [...new Set(subscriptions.map((subscription) => subscription.planId))];
  const plans = await GymPlan.find({ _id: { $in: planIds } }).lean();
  const planMap = new Map(plans.map((plan) => [String(plan._id), planResponse(plan)]));

  const now = new Date();
  const subMap = new Map();
  for (const s of subscriptions) {
    if (s.status === 'ACTIVE' && new Date(s.endDate) <= now) {
      s.status = 'EXPIRED';
      Subscription.updateOne({ _id: s._id }, { status: 'EXPIRED' }).catch(() => {});
    }
    subMap.set(s.userId, s);
  }

  const payments = await Payment.find({ userId: { $in: memberIds } }).sort({ createdAt: -1 }).lean();
  const paymentMap = new Map();
  for (const p of payments) {
    if (!paymentMap.has(p.userId)) {
      paymentMap.set(p.userId, p);
    }
  }

  const enriched = members.map((member) => {
    const sub = subMap.get(String(member._id));
    const pay = paymentMap.get(String(member._id));
    return {
      ...safeUser(member),
      membership: sub ? {
        ...sub,
        id: String(sub._id),
        plan: planMap.get(sub.planId) || null,
        daysRemaining: sub.endDate ? Math.max(0, Math.ceil((new Date(sub.endDate) - now) / 86400000)) : 0,
      } : null,
      latestPayment: pay ? { ...pay, id: String(pay._id) } : null,
    };
  });

  let filtered = enriched;
  if (tab === 'active') {
    filtered = enriched.filter((m) => m.membership && m.membership.status === 'ACTIVE' && new Date(m.membership.endDate) > now);
  } else if (tab === 'expired') {
    filtered = enriched.filter((m) => m.membership && (m.membership.status === 'EXPIRED' || new Date(m.membership.endDate) <= now));
  }

  res.json({ members: filtered });
});

app.get('/api/members/:id', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid member ID' });
  const member = await User.findOne({ _id: req.params.id, role: 'member' });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  const [subscription, history, workoutPlan] = await Promise.all([
    Subscription.findOne({ userId: String(member._id) }).lean(),
    Payment.find({ userId: String(member._id) }).sort({ createdAt: -1 }).lean(),
    WorkoutPlan.findOne({ memberId: String(member._id) }).lean(),
  ]);

  const planIds = [subscription?.planId, ...history.map((payment) => payment.planId)].filter(Boolean);
  const plans = await GymPlan.find({ _id: { $in: planIds } }).lean();
  const planMap = new Map(plans.map((plan) => [String(plan._id), planResponse(plan)]));

  res.json({
    member: {
      ...safeUser(member),
      membership: subscription ? { ...subscription, id: String(subscription._id), plan: planMap.get(subscription.planId) || null } : null,
      payments: history.map((payment) => ({ ...payment, id: String(payment._id), plan: planMap.get(payment.planId) || null })),
      workoutPlan: workoutPlan ? { ...workoutPlan, id: String(workoutPlan._id) } : null,
    },
  });
});

app.put('/api/members/:id', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid member ID' });
  const allowedFields = ['name', 'phone', 'email', 'village', 'profilePicture', 'dateOfBirth', 'gender', 'experience', 'isActive'];
  if (Object.keys(req.body || {}).some((field) => !allowedFields.includes(field))) return res.status(400).json({ message: 'Unsupported member fields' });
  const member = await User.findOneAndUpdate({ _id: req.params.id, role: 'member' }, { $set: req.body }, { new: true, runValidators: true });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  res.json({ member: safeUser(member) });
});

app.delete('/api/members/:id', auth, ownerOnly, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid member ID' });
  const memberId = req.params.id;

  // Prevent self-deletion
  if (String(req.user._id) === memberId) {
    return res.status(403).json({ message: 'Owners cannot delete their own account' });
  }

  const member = await User.findOne({ _id: memberId, role: 'member' });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  let session = null;
  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Subscription.deleteMany({ userId: memberId }).session(session);
      await Payment.deleteMany({ userId: memberId }).session(session);
      await WorkoutPlan.deleteMany({ memberId }).session(session);
      await Notification.deleteMany({ memberId }).session(session);
      await ReminderLog.deleteMany({ memberId }).session(session);
      if (Diet) {
        await Diet.deleteMany({ memberId }).session(session);
      }
      await User.deleteOne({ _id: memberId, role: 'member' }).session(session);
    });

    res.json({
      ok: true,
      message: `Member ${member.name} and all associated records permanently deleted from MongoDB.`,
    });
  } catch (error) {
    // Fallback for standalone Mongo or replica set transition
    try {
      await Promise.all([
        Subscription.deleteMany({ userId: memberId }),
        Payment.deleteMany({ userId: memberId }),
        WorkoutPlan.deleteMany({ memberId }),
        Notification.deleteMany({ memberId }),
        ReminderLog.deleteMany({ memberId }),
        Diet ? Diet.deleteMany({ memberId }) : Promise.resolve(),
        User.deleteOne({ _id: memberId, role: 'member' }),
      ]);
      res.json({
        ok: true,
        message: `Member ${member.name} and all associated records permanently deleted from MongoDB.`,
      });
    } catch (fallbackErr) {
      res.status(500).json({ message: 'Permanent deletion failed: ' + fallbackErr.message });
    }
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

app.get('/api/admin/dashboard', auth, ownerOnly, async (req, res) => {
  await generateExpiryNotifications(String(req.user._id));
  const now = new Date();

  // Fetch existing members first — all counts must be based ONLY on currently-existing members.
  const [memberUsers, activePlans] = await Promise.all([
    User.find({ role: 'member' }),
    GymPlan.countDocuments({ active: true }),
  ]);

  // Only consider subscriptions and payments whose userId maps to a currently-existing member.
  const existingMemberIds = memberUsers.map((m) => String(m._id));

  const [allSubscriptions, capturedPayments, recentPayments, recentMembers] = await Promise.all([
    existingMemberIds.length > 0
      ? Subscription.find({ userId: { $in: existingMemberIds } }).lean()
      : Promise.resolve([]),
    existingMemberIds.length > 0
      ? Payment.find({ status: 'CAPTURED', userId: { $in: existingMemberIds } }).lean()
      : Promise.resolve([]),
    existingMemberIds.length > 0
      ? Payment.find({ status: 'CAPTURED', userId: { $in: existingMemberIds } }).sort({ createdAt: -1 }).limit(10).lean()
      : Promise.resolve([]),
    User.find({ role: 'member' }).sort({ createdAt: -1 }).limit(10),
  ]);

  const activeSubscriptions = allSubscriptions.filter((sub) => sub.status === 'ACTIVE' && new Date(sub.endDate) > now);
  const expiredSubscriptions = allSubscriptions.filter((sub) => sub.status === 'EXPIRED' || (sub.endDate && new Date(sub.endDate) <= now));
  const expiringSoon = activeSubscriptions.filter((item) => (new Date(item.endDate) - now) / 86400000 <= 7).length;
  const revenue = capturedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const recentMemberIds = [...new Set(recentPayments.map((payment) => payment.userId))];
  const recentPlanIds = [...new Set(recentPayments.map((payment) => payment.planId))];
  const [recentPaymentUsers, recentPlans] = await Promise.all([
    recentMemberIds.length > 0 ? User.find({ _id: { $in: recentMemberIds } }) : Promise.resolve([]),
    recentPlanIds.length > 0 ? GymPlan.find({ _id: { $in: recentPlanIds } }).lean() : Promise.resolve([]),
  ]);

  const recentUserMap = new Map(recentPaymentUsers.map((member) => [String(member._id), safeUser(member)]));
  const recentPlanMap = new Map(recentPlans.map((plan) => [String(plan._id), planResponse(plan)]));

  res.json({
    stats: {
      totalMembers: memberUsers.length,
      activeMembers: activeSubscriptions.length,
      expiredMembers: expiredSubscriptions.length,
      expiringSoon,
      activePlans,
      revenue,
      newMembers: memberUsers.filter((member) => (Date.now() - member.createdAt) / 86400000 < 30).length,
    },
    members: memberUsers.map(safeUser),
    recentPayments: recentPayments.map((payment) => ({
      ...payment,
      id: String(payment._id),
      member: recentUserMap.get(payment.userId) || null,
      plan: recentPlanMap.get(payment.planId) || null,
    })),
    recentMembers: recentMembers.map(safeUser),
    revenueSeries: [],
    growthSeries: [],
  });
});
app.use((error, _, res, __) => {
  console.error('Request failed:', error);
  res.status(500).json({ message: error.message || 'Server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Warriors Gym API running on http://localhost:${PORT}`);
    connectDb().catch((e) => console.warn(e.message));
  });
}

module.exports = app;
