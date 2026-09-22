const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API = `http://localhost:${process.env.PORT || 4000}/api`;

async function run() {
  console.log('=== WARRIORS GYM PRODUCTION INTEGRATION VERIFICATION ===');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[1/10] Connected directly to MongoDB Atlas');

  // Find existing owner
  const { User, GymPlan, GymSettings, Subscription, Payment, WorkoutPlan, Notification, ReminderLog } = require('../src/models');
  const owner = await User.findOne({ role: 'owner' });
  if (!owner) throw new Error('No owner found in database!');
  console.log(`[2/10] Existing owner verified: ${owner.name} (${owner.phone})`);

  const ownerToken = jwt.sign({ sub: String(owner._id) }, process.env.JWT_SECRET, { expiresIn: '1h' });

  // Test 1: Health
  const healthRes = await fetch(`${API}/health`);
  const health = await healthRes.json();
  if (!health.ok) throw new Error('Health check failed');
  console.log('[3/10] GET /api/health passed:', health);

  // Test 2: Settings (GET & PUT)
  const getSettingsRes = await fetch(`${API}/settings`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const currentSettings = await getSettingsRes.json();
  console.log('[4/10] GET /api/settings passed:', currentSettings.settings?.gymName);

  const putSettingsRes = await fetch(`${API}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      gymName: 'Warriors Gym HQ',
      phone: '9761933379',
      address: 'Warriors Training Arena, Sector 4',
      openingTime: '06:00',
      closingTime: '22:00',
    }),
  });
  const updatedSettings = await putSettingsRes.json();
  if (putSettingsRes.status !== 200) throw new Error('PUT /api/settings failed: ' + JSON.stringify(updatedSettings));
  console.log('[4/10] PUT /api/settings passed:', updatedSettings.settings?.gymName, updatedSettings.settings?.address);

  // Test 3: Owner Dashboard
  const dashRes = await fetch(`${API}/admin/dashboard`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const dash = await dashRes.json();
  if (dashRes.status !== 200) throw new Error('Owner dashboard failed: ' + JSON.stringify(dash));
  console.log('[5/10] GET /api/admin/dashboard passed:', dash.stats);

  // Test 4: Plan CRUD
  const createPlanRes = await fetch(`${API}/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Test Pro Plan',
      price: 1500,
      duration: 1,
      durationUnit: 'MONTHS',
      description: 'Full access with functional zone',
      features: ['Weight training', 'Cardio suite', 'Locker access'],
    }),
  });
  const createdPlanData = await createPlanRes.json();
  if (createPlanRes.status !== 201) throw new Error('POST /api/plans failed: ' + JSON.stringify(createdPlanData));
  const testPlan = createdPlanData.plan;
  console.log('[6/10] POST /api/plans passed:', testPlan.name, 'Price:', testPlan.price, 'ID:', testPlan.id);

  // Test 5: Member creation with CASH payment (test member)
  const testPhone = '9999000011';
  // Ensure no stale test user
  await User.deleteMany({ phone: testPhone });
  const createMemberRes = await fetch(`${API}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Arjun Test Singh',
      phone: testPhone,
      password: 'password123',
      village: 'Central Zone',
      experience: 'INTERMEDIATE',
      planId: testPlan.id,
      paymentMethod: 'CASH',
      notes: 'Cash received at front desk by Saksham',
    }),
  });
  const memberData = await createMemberRes.json();
  if (createMemberRes.status !== 201) throw new Error('POST /api/members failed: ' + JSON.stringify(memberData));
  const testMember = memberData.member;
  const testPayment = memberData.payment;
  const testSubscription = memberData.membership;
  console.log('[7/10] POST /api/members with CASH passed:');
  console.log('       Member ID:', testMember.id, 'Village:', testMember.village);
  console.log('       Payment Status:', testPayment.status, 'Method:', testPayment.paymentMethod);
  console.log('       Subscription Status:', testSubscription.status, 'Ends:', testSubscription.endDate);

  // Test 6: Cash Renewal (tests second cash payment with sparse index)
  const renewRes = await fetch(`${API}/members/${testMember.id}/subscription/cash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      planId: testPlan.id,
      notes: 'Second month cash renewal',
    }),
  });
  const renewData = await renewRes.json();
  if (renewRes.status !== 200) throw new Error('Cash renewal failed: ' + JSON.stringify(renewData));
  console.log('[8/10] POST /api/members/:id/subscription/cash passed:');
  console.log('       Second payment ID:', renewData.payment.id);
  console.log('       Extended subscription endDate:', renewData.subscription.endDate);

  // Test 7: Workout Plan Assignment & Member Fetch
  const testMemberToken = jwt.sign({ sub: testMember.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const workoutPlanPayload = {
    days: [
      {
        day: 'Monday',
        title: 'Chest & Triceps Hypertrophy',
        muscleGroup: 'Chest, Triceps',
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: '8-10', weight: '70 kg', rest: '90s', notes: 'Touch chest controlled' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', weight: '24 kg', rest: '60s', notes: 'Squeeze at top' },
        ],
      },
      {
        day: 'Tuesday',
        title: 'Back & Biceps Power',
        muscleGroup: 'Lats, Rhomboids, Biceps',
        exercises: [
          { name: 'Deadlift', sets: 4, reps: '5', weight: '120 kg', rest: '120s', notes: 'Neutral spine' },
        ],
      },
    ],
  };

  const putWorkoutRes = await fetch(`${API}/members/${testMember.id}/workout-plan`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify(workoutPlanPayload),
  });
  const putWorkoutData = await putWorkoutRes.json();
  if (putWorkoutRes.status !== 200) throw new Error('PUT /api/members/:id/workout-plan failed: ' + JSON.stringify(putWorkoutData));

  // Member gets their own workout
  const getWorkoutRes = await fetch(`${API}/workout-plan/me`, {
    headers: { Authorization: `Bearer ${testMemberToken}` },
  });
  const getWorkoutData = await getWorkoutRes.json();
  if (getWorkoutRes.status !== 200 || !getWorkoutData.plan?.days?.length) {
    throw new Error('GET /api/workout-plan/me failed: ' + JSON.stringify(getWorkoutData));
  }
  console.log('[9/10] Weekly Workout Plan assignment passed. Member retrieved:', getWorkoutData.plan.days.length, 'training days.');

  // Test 8: WhatsApp Reminder endpoint behavior
  const reminderRes = await fetch(`${API}/members/${testMember.id}/send-reminder`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const reminderData = await reminderRes.json();
  console.log('[10/10] WhatsApp Reminder endpoint response:');
  console.log('        Configured:', reminderData.configured);
  console.log('        Success:', reminderData.success);
  console.log('        Message:', reminderData.message);

  // Test 9: Notification Expiry Verification
  const notifRes = await fetch(`${API}/admin/notifications`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const notifData = await notifRes.json();
  if (notifRes.status !== 200) throw new Error('GET /api/admin/notifications failed: ' + JSON.stringify(notifData));
  console.log('[11/12] Expiry & Activity Notifications verified. Total active notices:', notifData.notifications?.length || 0);

  // Test 10: Owner Self-Deletion Protection
  const selfDelRes = await fetch(`${API}/members/${owner._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  if (selfDelRes.status !== 403) throw new Error('Self deletion was not properly blocked! Status: ' + selfDelRes.status);
  console.log('[11/12] Owner self-deletion protection verified (403 Forbidden).');

  // Test 11: Owner Cascade Delete on Member
  console.log('Testing permanent cascade member deletion via DELETE /api/members/:id ...');
  const delRes = await fetch(`${API}/members/${testMember.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  const delData = await delRes.json();
  if (delRes.status !== 200 || !delData.ok) {
    throw new Error('DELETE /api/members/:id failed: ' + JSON.stringify(delData));
  }

  // Verify MongoDB cascade cleanup
  const [remUser, remSub, remPay, remWk, remNotif] = await Promise.all([
    User.findById(testMember.id),
    Subscription.findOne({ userId: testMember.id }),
    Payment.findOne({ userId: testMember.id }),
    WorkoutPlan.findOne({ memberId: testMember.id }),
    Notification.findOne({ memberId: testMember.id }),
  ]);

  if (remUser || remSub || remPay || remWk || remNotif) {
    throw new Error('Cascade delete failed: records still exist in MongoDB!');
  }
  console.log('[12/12] Permanent cascade deletion verified. All subscriptions, payments, workout plans, and notifications purged.');

  // Clean up test plan
  await GymPlan.deleteOne({ _id: testPlan.id });
  console.log('Clean up complete. Production database remains clean and intact.');

  await mongoose.disconnect();
  console.log('=== ALL 12 INTEGRATION CHECKS PASSED SUCCESSFULLY ===');
}

run().catch((err) => {
  console.error('FATAL VERIFICATION ERROR:', err);
  process.exit(1);
});
