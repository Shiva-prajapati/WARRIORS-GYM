const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  phone: { type: String, required: true, unique: true, index: true, trim: true, match: /^\+?[0-9]{10,15}$/ },
  email: { type: String, lowercase: true, trim: true, sparse: true, unique: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['member', 'owner'], default: 'member', required: true },
  village: { type: String, trim: true, maxlength: 100 },
  profilePicture: { type: String, maxlength: 3_000_000 },
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] },
  experience: { type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], default: 'BEGINNER' },
  isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true, strict: true });
userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'owner' } });
userSchema.index({ role: 1, createdAt: -1 });

const gymPlanSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  duration: { type: Number, required: true, min: 1, max: 120 },
  durationUnit: { type: String, enum: ['MONTHS', 'DAYS', 'YEARS'], default: 'MONTHS' },
  price: { type: Number, required: true, min: 1, max: 10_000_000 },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  features: { type: [String], default: [] },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true, strict: true });
gymPlanSchema.index({ active: 1, price: 1 });

const paymentSchema = new Schema({
  userId: { type: String, required: true, index: true },
  planId: { type: String, required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, enum: ['INR'], required: true, default: 'INR' },
  razorpayOrderId: { type: String, unique: true, sparse: true, index: true },
  razorpayPaymentId: { type: String, unique: true, sparse: true, index: true },
  status: { type: String, enum: ['PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED'], default: 'PENDING', index: true },
  paymentMethod: { type: String, default: null, index: true },
  notes: { type: String, trim: true, maxlength: 500, default: null },
  failureReason: { type: String, default: null },
  activatedAt: { type: Date, default: null },
}, { timestamps: true, strict: true });
paymentSchema.index({ userId: 1, createdAt: -1 });

const subscriptionSchema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  planId: { type: String, required: true },
  planName: { type: String, default: null },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED', 'PAYMENT FAILED'], required: true, index: true },
  paymentId: { type: String, required: true },
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
  paymentMethod: { type: String, default: null },
  amount: { type: Number, default: null },
  notes: { type: String, default: null },
}, { timestamps: true, strict: true });

const workoutSchema = new Schema({
  name: { type: String, required: true, trim: true },
  level: { type: String, trim: true },
  schedule: { type: [[String]], default: [] },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true, strict: true });

const exerciseSchema = new Schema({
  name: { type: String, required: true, trim: true },
  sets: { type: Number, default: 3, min: 1, max: 100 },
  reps: { type: String, default: '10', trim: true },
  weight: { type: String, default: '', trim: true },
  rest: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true },
}, { _id: false });

const workoutDaySchema = new Schema({
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  title: { type: String, default: '', trim: true },
  muscleGroup: { type: String, default: '', trim: true },
  exercises: { type: [exerciseSchema], default: [] },
}, { _id: false });

const workoutPlanSchema = new Schema({
  memberId: { type: String, required: true, unique: true, index: true },
  ownerId: { type: String, required: true },
  weekStartDate: { type: Date, default: null },
  days: { type: [workoutDaySchema], default: [] },
}, { timestamps: true, strict: true });

const dietSchema = new Schema({
  name: { type: String, required: true, trim: true },
  meals: { type: [[String]], default: [] },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true, strict: true });

const notificationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  memberId: { type: String, required: true, index: true },
  subscriptionId: { type: String, index: true },
  type: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  daysRemaining: { type: Number, default: null },
  read: { type: Boolean, default: false, index: true },
  reminderSentAt: { type: Date, default: null },
  reminderStatus: { type: String, default: null },
}, { timestamps: true, strict: true });
notificationSchema.index({ subscriptionId: 1, type: 1 }, { unique: true, sparse: true });

const reminderLogSchema = new Schema({
  memberId: { type: String, required: true, index: true },
  recipientPhone: { type: String, required: true },
  message: { type: String, required: true },
  provider: { type: String, required: true },
  status: { type: String, enum: ['SENT', 'FAILED', 'NOT_CONFIGURED', 'PREPARED', 'OPENED'], required: true },
  providerResponse: { type: Schema.Types.Mixed, default: null },
  triggeredBy: { type: String, required: true },
  sentAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true, strict: true });




const webhookEventSchema = new Schema({
  eventId: { type: String, required: true, unique: true, index: true },
  event: { type: String, required: true },
  razorpayOrderId: { type: String, default: null },
  razorpayPaymentId: { type: String, default: null },
}, { timestamps: true, strict: true });

module.exports = {
  User: mongoose.models.User || mongoose.model('User', userSchema),
  GymPlan: mongoose.models.GymPlan || mongoose.model('GymPlan', gymPlanSchema),
  Payment: mongoose.models.Payment || mongoose.model('Payment', paymentSchema),
  Subscription: mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema),
  Workout: mongoose.models.Workout || mongoose.model('Workout', workoutSchema),
  WorkoutPlan: mongoose.models.WorkoutPlan || mongoose.model('WorkoutPlan', workoutPlanSchema),
  Diet: mongoose.models.Diet || mongoose.model('Diet', dietSchema),
  Notification: mongoose.models.Notification || mongoose.model('Notification', notificationSchema),
  ReminderLog: mongoose.models.ReminderLog || mongoose.model('ReminderLog', reminderLogSchema),
  WebhookEvent: mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema),
};
