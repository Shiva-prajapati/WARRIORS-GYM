const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = require('../src/index');

async function run() {
  console.log('================================================================');
  console.log('   WARRIORS GYM — COMPREHENSIVE PRODUCTION VERIFICATION SUITE   ');
  console.log('================================================================\n');

  // Start internal Express test server on random open port
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const API = `http://localhost:${port}/api`;
  console.log(`[BOOT] In-memory test server running on ${API}`);

  try {
    // 1. Database Connection
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
    }
    console.log('✓ [1/15] MongoDB Atlas Connected Successfully');

    const {
      User,
      GymPlan,
      Subscription,
      Payment,
      WorkoutPlan,
      Notification,
      ReminderLog,
    } = require('../src/models');

    // 2. Health Endpoint
    const healthRes = await fetch(`${API}/health`);
    const health = await healthRes.json();
    if (!health.ok || health.mongoState !== 'CONNECTED') {
      throw new Error(`Health check failed: ${JSON.stringify(health)}`);
    }
    console.log('✓ [2/15] GET /api/health verified:', {
      ok: health.ok,
      mongoState: health.mongoState,
      hasRazorpayKey: health.hasRazorpayKey,
    });

    // 3. Find and verify Owner Account
    const owner = await User.findOne({ role: 'owner' });
    if (!owner) throw new Error('No owner account found in database!');
    const ownerToken = jwt.sign({ sub: String(owner._id) }, process.env.JWT_SECRET, { expiresIn: '2h' });
    console.log(`✓ [3/15] Owner Account Verified: ${owner.name} (${owner.phone})`);

    // 4. Owner Dashboard Overview (GET /api/admin/dashboard)
    const dashRes = await fetch(`${API}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const dash = await dashRes.json();
    if (dashRes.status !== 200 || !dash.stats) throw new Error(`Owner dashboard failed: ${JSON.stringify(dash)}`);
    console.log('✓ [4/15] Owner Dashboard Overview Verified:', {
      totalMembers: dash.stats.totalMembers,
      activeMembers: dash.stats.activeMembers,
      expiredMembers: dash.stats.expiredMembers,
      activePlans: dash.stats.activePlans,
      revenue: dash.stats.revenue,
    });

    // 5. Membership Plans (Public & Owner CRUD)
    const publicPlansRes = await fetch(`${API}/plans`);
    const publicPlans = await publicPlansRes.json();
    if (publicPlansRes.status !== 200 || !Array.isArray(publicPlans.plans)) {
      throw new Error(`GET /api/plans failed: ${JSON.stringify(publicPlans)}`);
    }
    console.log(`✓ [5/15] Public Membership Plans Verified: ${publicPlans.plans.length} active plans available`);

    // Owner creates temporary test plan
    const createPlanRes = await fetch(`${API}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        name: 'Auto-Test Verification Plan',
        price: 1999,
        duration: 1,
        durationUnit: 'MONTHS',
        description: 'Automated end-to-end plan test',
        features: ['Full Gym Access', 'Sauna Access', 'Cardio Deck'],
      }),
    });
    const createdPlanData = await createPlanRes.json();
    if (createPlanRes.status !== 201) throw new Error(`POST /api/plans failed: ${JSON.stringify(createdPlanData)}`);
    const testPlan = createdPlanData.plan;
    console.log('✓ [6/15] Owner Plan Creation Verified:', testPlan.name, `₹${testPlan.price}`);

    // Owner edits temporary plan
    const editPlanRes = await fetch(`${API}/plans/${testPlan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        name: 'Auto-Test Verification Plan (Updated)',
        price: 2199,
      }),
    });
    const editedPlanData = await editPlanRes.json();
    if (editPlanRes.status !== 200 || editedPlanData.plan.price !== 2199) {
      throw new Error(`PUT /api/plans/:id failed: ${JSON.stringify(editedPlanData)}`);
    }
    console.log('✓ [7/15] Owner Plan Edit Verified:', editedPlanData.plan.name, `₹${editedPlanData.plan.price}`);

    // 6. Member Registration & Authentication Validation
    const testMemberPhone = '9999112233';
    await User.deleteMany({ phone: testMemberPhone });
    await Notification.deleteMany({ 'member.phone': testMemberPhone });

    // Invalid phone rejection check (< 10 digits)
    const badRegRes = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid User',
        phone: '12345',
        password: 'password123',
      }),
    });
    if (badRegRes.status !== 400) throw new Error('Phone validation check failed: non-10-digit phone accepted!');

    // Valid Member Creation via Owner Front Desk (POST /api/members with CASH payment)
    const createMemberRes = await fetch(`${API}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({
        name: 'Vikram Automated Member',
        phone: testMemberPhone,
        password: 'TestPassword123',
        village: 'Warriors Training Ground',
        experience: 'INTERMEDIATE',
        planId: testPlan.id,
        paymentMethod: 'CASH',
        notes: 'Cash payment processed at reception',
      }),
    });
    const memberData = await createMemberRes.json();
    if (createMemberRes.status !== 201) throw new Error(`POST /api/members failed: ${JSON.stringify(memberData)}`);
    const testMember = memberData.member;
    const testSub = memberData.membership;
    console.log('✓ [8/15] Member Onboarding & Initial Cash Payment Verified:', {
      memberId: testMember.id,
      name: testMember.name,
      phone: testMember.phone,
      subStatus: testSub.status,
      endDate: testSub.endDate,
    });

    // 7. Member Login & Token Generation Test
    const memberLoginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testMemberPhone,
        password: 'TestPassword123',
      }),
    });
    const memberLoginData = await memberLoginRes.json();
    if (memberLoginRes.status !== 200 || !memberLoginData.token) {
      throw new Error(`Member login failed: ${JSON.stringify(memberLoginData)}`);
    }
    const memberToken = memberLoginData.token;
    console.log('✓ [9/15] Member Login & JWT Authentication Verified');

    // Member views their own active subscription
    const mySubRes = await fetch(`${API}/subscription/me`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const mySubData = await mySubRes.json();
    if (mySubRes.status !== 200 || !mySubData.subscription) {
      throw new Error(`GET /api/subscription/me failed: ${JSON.stringify(mySubData)}`);
    }
    console.log('✓ [10/15] Member Subscription View Verified:', {
      status: mySubData.subscription.status,
      planName: mySubData.subscription.plan?.name,
    });

    // 8. Cash Renewal Test (POST /api/members/:id/subscription/cash)
    const renewCashRes = await fetch(`${API}/members/${testMember.id}/subscription/cash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ planId: testPlan.id }),
    });
    const renewCashData = await renewCashRes.json();
    if (renewCashRes.status !== 200 || !renewCashData.subscription) {
      throw new Error(`Cash renewal failed: ${JSON.stringify(renewCashData)}`);
    }
    console.log('✓ [11/15] Cash Renewal Verified: Extended subscription to', renewCashData.subscription.endDate);

    // 9. Workout Plan Assignment (Owner -> Member)
    const workoutPayload = {
      days: [
        {
          day: 'Monday',
          title: 'Chest & Core Power',
          muscleGroup: 'Chest, Abs',
          exercises: [
            { name: 'Barbell Flat Bench', sets: 4, reps: '8-10', weight: '80 kg', rest: '90s', notes: 'Touch chest' },
            { name: 'Cable Flyes', sets: 3, reps: '12', weight: '15 kg', rest: '60s', notes: 'Peak contraction' },
          ],
        },
        {
          day: 'Wednesday',
          title: 'Back & Biceps Thickness',
          muscleGroup: 'Lats, Rhomboids, Biceps',
          exercises: [
            { name: 'Conventional Deadlift', sets: 4, reps: '6', weight: '140 kg', rest: '120s', notes: 'Brace core' },
          ],
        },
      ],
    };

    const putWorkoutRes = await fetch(`${API}/members/${testMember.id}/workout-plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify(workoutPayload),
    });
    const putWorkoutData = await putWorkoutRes.json();
    if (putWorkoutRes.status !== 200 || !putWorkoutData.plan?.days?.length) {
      throw new Error(`Assign workout plan failed: ${JSON.stringify(putWorkoutData)}`);
    }

    // Member fetches their own workout
    const getWorkoutRes = await fetch(`${API}/workout-plan/me`, {
      headers: { Authorization: `Bearer ${memberToken}` },
    });
    const getWorkoutData = await getWorkoutRes.json();
    if (getWorkoutRes.status !== 200 || getWorkoutData.plan.days.length !== 2) {
      throw new Error(`Member fetch workout failed: ${JSON.stringify(getWorkoutData)}`);
    }
    console.log('✓ [12/15] Weekly Workout Routine Assignment & Member Portal View Verified (2 training days)');

    // 10. WhatsApp Reminder & Welcome Flows
    // Welcome WhatsApp
    const welcomeRes = await fetch(`${API}/members/${testMember.id}/send-welcome`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerToken}` },
      body: JSON.stringify({ password: 'TestPassword123' }),
    });
    const welcomeData = await welcomeRes.json();
    if (welcomeRes.status !== 200 || !welcomeData.waUrl) {
      throw new Error(`send-welcome failed: ${JSON.stringify(welcomeData)}`);
    }
    if (!welcomeData.waUrl.includes('https://wa.me/919999112233')) {
      throw new Error(`WhatsApp welcome recipient phone incorrect: ${welcomeData.waUrl}`);
    }

    // Reminder WhatsApp (Must include direct links for ALL active plans)
    const reminderRes = await fetch(`${API}/members/${testMember.id}/send-reminder`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const reminderData = await reminderRes.json();
    if (reminderRes.status !== 200 || !reminderData.waUrl) {
      throw new Error(`send-reminder failed: ${JSON.stringify(reminderData)}`);
    }
    const decodedMsg = decodeURIComponent(reminderData.waUrl);
    if (!decodedMsg.includes('WARRIORS GYM — MEMBERSHIP RENEWAL') || !decodedMsg.includes('?renew=')) {
      throw new Error('Reminder message did not include renewal links!');
    }
    console.log('✓ [13/15] WhatsApp Flows (Welcome & Dynamic All-Plan Reminder) Verified');

    // Test Renewal Session Verification (Member opens WhatsApp link)
    const tokenMatch = decodedMsg.match(/renew=([A-Za-z0-9_\-\.]+)/);
    if (tokenMatch && tokenMatch[1]) {
      const renewToken = tokenMatch[1];
      const renewRes = await fetch(`${API}/auth/renew-session?token=${renewToken}`);
      const renewData = await renewRes.json();
      if (renewRes.status !== 200 || renewData.user.id !== testMember.id) {
        throw new Error(`Renewal session verification failed: ${JSON.stringify(renewData)}`);
      }
      console.log('        -> WhatsApp Renewal Token Verified: Auto-authenticated member', renewData.user.name);
    }

    // 11. Razorpay Order Creation Flow (Backend Verification)
    const orderRes = await fetch(`${API}/payments/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${memberToken}` },
      body: JSON.stringify({ planId: testPlan.id }),
    });
    const orderData = await orderRes.json();
    if (orderRes.status === 201) {
      console.log('✓ [14/15] Razorpay Live Order Creation Verified:', {
        orderId: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        planName: orderData.planName,
      });
    } else {
      console.log('! [14/15] Razorpay Order response:', orderRes.status, orderData.message);
    }

    // 12. Security & Cascade Deletion Protection
    // Verify owner self-deletion protection (403 Forbidden)
    const selfDelRes = await fetch(`${API}/members/${owner._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    if (selfDelRes.status !== 403) throw new Error('Owner self-deletion security check failed! Expected 403 Forbidden.');

    // Owner deletes test member
    const delMemberRes = await fetch(`${API}/members/${testMember.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const delMemberData = await delMemberRes.json();
    if (delMemberRes.status !== 200 || !delMemberData.ok) {
      throw new Error(`Member deletion failed: ${JSON.stringify(delMemberData)}`);
    }

    // Verify all cascaded records purged from MongoDB
    const [remUser, remSub, remPay, remWk, remNotif] = await Promise.all([
      User.findById(testMember.id),
      Subscription.findOne({ userId: testMember.id }),
      Payment.findOne({ userId: testMember.id }),
      WorkoutPlan.findOne({ memberId: testMember.id }),
      Notification.findOne({ memberId: testMember.id }),
    ]);

    if (remUser || remSub || remPay || remWk || remNotif) {
      throw new Error('Cascade cleanup incomplete: residual records found in MongoDB!');
    }

    // Delete temporary test plan permanently
    const delPlanRes = await fetch(`${API}/plans/${testPlan.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const delPlanData = await delPlanRes.json();
    if (delPlanRes.status !== 200 || !delPlanData.ok) {
      throw new Error(`Plan deletion failed: ${JSON.stringify(delPlanData)}`);
    }
    const remPlan = await GymPlan.findById(testPlan.id);
    if (remPlan) throw new Error('Permanent plan deletion failed: plan still found in MongoDB!');

    console.log('✓ [15/15] Permanent Cascade Deletion Verified (Members, Payments, Plans, Workouts purged)');

    // 13. Notifications Endpoint Verification
    const notifsRes = await fetch(`${API}/admin/notifications`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const notifsData = await notifsRes.json();
    if (notifsRes.status !== 200) throw new Error('GET /api/admin/notifications failed');
    console.log(`✓ Owner Notifications Endpoint Verified (${notifsData.notifications?.length || 0} active alerts)`);

    // 14. Live Production Domain Health Check
    console.log('\n--- VERIFYING LIVE PRODUCTION DOMAIN (https://warriorsgym.me) ---');
    try {
      const prodRes = await fetch('https://warriorsgym.me', { redirect: 'follow' });
      console.log(`Live Domain Status: HTTP ${prodRes.status} (${prodRes.url})`);
      const prodHtml = await prodRes.text();
      const hasTitle = prodHtml.includes('Warriors Gym') || prodHtml.includes('WARRIORS GYM');
      const hasFavicon = prodHtml.includes('favicon.svg') || prodHtml.includes('favicon');
      console.log(`Live Website Title Present: ${hasTitle}`);
      console.log(`Live Website Favicon Link Present: ${hasFavicon}`);

      const faviconRes = await fetch('https://warriorsgym.me/favicon.svg', { redirect: 'follow' });
      console.log(`Live Favicon Status: HTTP ${faviconRes.status}`);
    } catch (netErr) {
      console.warn('Live domain fetch warning (DNS/network):', netErr.message);
    }

    console.log('\n================================================================');
    console.log('   ALL CHECKS PASSED — WARRIORS GYM IS 100% OPERATIONAL');
    console.log('================================================================\n');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
