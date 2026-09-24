import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  ChevronRight,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import "./App.css";

const rawApi = (import.meta.env.VITE_API_URL || "/api").trim().replace(/\/+$/, "");
const API = (typeof window !== "undefined" && (window.location.hostname.includes("warriorsgym.me") || window.location.hostname.includes("vercel.app")))
  ? "/api"
  : (rawApi.endsWith("/api") ? rawApi : (rawApi.startsWith("http") ? `${rawApi}/api` : "/api"));
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const token = () => localStorage.getItem("warrior_token");
async function api(path, options = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API}${normalizedPath}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      !res.ok
        ? `Server error (${res.status}): ${res.statusText || "Service unavailable"}`
        : "Invalid server response"
    );
  }
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}

const openWhatsAppUrl = (url) => {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
};

function formatPhoneForWhatsApp(phone) {
  let cleaned = String(phone || "").replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }
  return cleaned;
}

const setMemberCreationPassword = (phone, password) => {
  if (!phone || !password) return;
  const clean = String(phone).replace(/[^0-9]/g, "");
  try {
    sessionStorage.setItem(`warrior_created_pwd_${clean}`, password);
    if (clean.length === 10) {
      sessionStorage.setItem(`warrior_created_pwd_91${clean}`, password);
    }
  } catch {}
};

const getMemberCreationPassword = (phone) => {
  if (!phone) return "";
  const clean = String(phone).replace(/[^0-9]/g, "");
  try {
    return (
      sessionStorage.getItem(`warrior_created_pwd_${clean}`) ||
      (clean.length === 10 ? sessionStorage.getItem(`warrior_created_pwd_91${clean}`) : "") ||
      (clean.startsWith("91") && clean.length === 12 ? sessionStorage.getItem(`warrior_created_pwd_${clean.slice(2)}`) : "") ||
      ""
    );
  } catch {
    return "";
  }
};

function buildWelcomeWhatsAppUrl(member, plans = [], customPassword = null) {
  const memberName = member?.name || "Member";
  const phone = member?.phone || "";
  const recipientPhone = formatPhoneForWhatsApp(phone);

  const sub = member?.membership;
  let plan = sub?.plan;
  if (!plan && sub?.planId && Array.isArray(plans)) {
    plan = plans.find((p) => String(p.id) === String(sub.planId));
  }

  const planName = plan?.name || sub?.planName || "WARRIORS MEMBERSHIP";

  const formatDate = (d) => {
    if (!d) return "N/A";
    const date = new Date(d);
    return isNaN(date.getTime())
      ? "N/A"
      : date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
  };

  const startDate = formatDate(sub?.startDate);
  const endDate = formatDate(sub?.endDate);
  const password = customPassword || getMemberCreationPassword(phone) || "[As set during registration]";

  const lines = [
    "🎉 WELCOME TO WARRIORS GYM! 💪",
    "",
    `Congratulations, ${memberName}! 🔥`,
    "",
    "Your Warriors Gym membership is now ACTIVE.",
    "",
    `🏋️ Your Plan: ${planName}`,
    `📅 Start Date: ${startDate}`,
    `⏳ Valid Until: ${endDate}`,
    "",
    "🔐 YOUR LOGIN DETAILS",
    "",
    `ID: ${phone}`,
    `Password: ${password}`,
    "",
    "🌐 LOGIN TO YOUR WARRIORS GYM PORTAL:",
    "https://warriorsgym.me",
    "",
    "👉 Open the website",
    '👉 Click "Join Warriors" / Login',
    "👉 Enter your ID and Password",
    "👉 Complete your profile",
    "👉 Check your membership and workout plan",
    "👉 Enjoy your Warriors Gym portal! 🚀",
    "",
    "If you have any problem while logging in, contact Warriors Gym.",
    "",
    "🔥 TRAIN HARD",
    "💪 STAY CONSISTENT",
    "🏆 BECOME A WARRIOR",
    "",
    "Welcome to WARRIORS GYM! ❤️",
  ];

  const message = lines.join("\n");
  return `https://wa.me/${recipientPhone}?text=${encodeURIComponent(message)}`;
}


function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <span className="brand-mark">W</span>
      <span>
        <b>WARRIORS</b>
        <small>GYM / PERFORMANCE CLUB</small>
      </span>
    </div>
  );
}
function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
function Status({ status }) {
  return (
    <span className={`status status-${String(status).toLowerCase()}`}>
      <span />
      {status}
    </span>
  );
}

function Landing({ onLogin, onRegister }) {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Brand />
        <div className="nav-links">
          <a href="#method">Method</a>
          <a href="#plans">Membership</a>
          <a href="#contact">Contact</a>
        </div>
        <Button variant="outline" onClick={() => onLogin("member")}>
          Member login <ArrowUpRight size={15} />
        </Button>
      </nav>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> EST. 2018 · WARRIORS PERFORMANCE CLUB
          </div>
          <h1>
            BUILD YOUR
            <br />
            <em>STRENGTH.</em>
          </h1>
          <p className="hero-tagline">
            A focused training environment for people who are serious about
            becoming harder to stop.
          </p>
          <div className="hero-actions">
            <Button onClick={onRegister}>
              Join warriors <ArrowUpRight size={17} />
            </Button>
            <button className="text-action" onClick={() => onLogin("owner")}>
              Owner portal <ChevronRight size={17} />
            </button>
          </div>
          <div className="hero-proof">
            <div className="proof-avatars">
              <span>AS</span>
              <span>RK</span>
              <span>PM</span>
            </div>
            <div>
              <b>4.9 / 5</b>
              <small>from 240+ warriors</small>
            </div>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-glow" />
          <div className="plate plate-back">45</div>
          <div className="plate plate-mid">25</div>
          <div className="plate plate-front">W</div>
          <div className="barbell">
            <span />
            <i />
            <span />
          </div>
          <div className="art-label">
            <small>01 / 03</small>
            <b>
              DISCIPLINE
              <br />
              OVER MOTIVATION
            </b>
          </div>
        </div>
      </section>
      <section className="marquee">
        <span>TRAIN WITH INTENT</span>
        <i>✦</i>
        <span>EAT WITH PURPOSE</span>
        <i>✦</i>
        <span>LIVE WITH POWER</span>
        <i>✦</i>
        <span>TRAIN WITH INTENT</span>
      </section>
      <section className="manifesto" id="method">
        <div>
          <div className="eyebrow">THE WARRIORS METHOD</div>
          <h2>
            YOUR NEXT LEVEL
            <br />
            <em>IS BUILT DAILY.</em>
          </h2>
        </div>
        <p>
          We combine intelligent programming, honest coaching, and a community
          that expects more from you. No noise. No shortcuts. Just the work that
          changes everything.
        </p>
        <div className="manifesto-stats">
          <div>
            <b>06</b>
            <small>
              Years sharpening
              <br />
              the craft
            </small>
          </div>
          <div>
            <b>240+</b>
            <small>
              Active warriors
              <br />
              in the club
            </small>
          </div>
          <div>
            <b>24/7</b>
            <small>
              Digital training
              <br />
              companion
            </small>
          </div>
        </div>
      </section>
      <section className="plan-strip" id="plans">
        <div>
          <div className="eyebrow">MEMBERSHIP, WITHOUT THE FRICTION</div>
          <h2>
            CHOOSE YOUR
            <br />
            <em>COMMITMENT.</em>
          </h2>
        </div>
        <div className="plan-teaser">
          <span>Most popular</span>
          <b>WARRIOR 3 MONTHS</b>
          <strong>{money.format(2499)}</strong>
          <Button onClick={onRegister}>
            See plans <ArrowUpRight size={15} />
          </Button>
        </div>
      </section>
      <footer id="contact">
        <Brand compact />
        <span>BUILD YOUR STRENGTH. BUILD YOURSELF.</span>
        <span>© 2026 WARRIORS GYM</span>
      </footer>
    </main>
  );
}

function Auth({ mode, onSuccess, onBack }) {
  const [owner, setOwner] = useState(mode === "owner");
  const [register, setRegister] = useState(mode === "register");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    village: "",
    profilePicture: "",
    experience: "BEGINNER",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const updatePicture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setError("Please choose an image smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, profilePicture: reader.result });
    reader.readAsDataURL(file);
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("warrior_token", data.token);
      onSuccess(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <div className="auth-visual">
        <button className="back-button" onClick={onBack}>
          ← Back to home
        </button>
        <Brand />
        <div className="auth-visual-copy">
          <div className="eyebrow">
            {owner ? "OWNER COMMAND CENTER" : "THE WARRIORS CLUB"}
          </div>
          <h1>
            {owner ? (
              <>
                RUN THE<br />
                <em>MISSION.</em>
              </>
            ) : (
              <>
                EARN YOUR<br />
                <em>EDGE.</em>
              </>
            )}
          </h1>
          <p>
            {owner
              ? "A clear view of the people, revenue, and momentum behind your gym."
              : "Your training, performance, and progress plan in one focused place."}
          </p>
        </div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-toggle">
          <button
            className={!owner && !register ? "selected" : ""}
            onClick={() => {
              setOwner(false);
              setRegister(false);
            }}
          >
            Member login
          </button>
          <button
            className={owner ? "selected" : ""}
            onClick={() => {
              setOwner(true);
              setRegister(false);
            }}
          >
            Owner login
          </button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="form-heading">
            <span className="kicker">
              {register
                ? "START HERE"
                : owner
                  ? "SECURE ACCESS"
                  : "WELCOME BACK"}
            </span>
            <h2>
              {register
                ? "Create your warrior profile."
                : owner
                  ? "Welcome, commander."
                  : "Welcome back, warrior."}
            </h2>
            <p>
              {register
                ? "A few details, then we start building."
                : "Enter your details to continue your journey."}
            </p>
          </div>
          {register && (
            <>
              <label>
                Full name
                <input
                  name="name"
                  value={form.name}
                  onChange={update}
                  placeholder="e.g. Riya Sharma"
                  required
                />
              </label>
              <label>
                Village / Locality
                <input
                  name="village"
                  value={form.village}
                  onChange={update}
                  placeholder="Village or locality name"
                />
              </label>
            </>
          )}
          <label>
            Phone number
            <input
              name="phone"
              value={form.phone}
              onChange={update}
              placeholder="10 digit mobile number"
              required
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={update}
              placeholder="••••••••"
              required
            />
          </label>
          {register && (
            <label className="picture-upload">
              Profile picture
              <input type="file" accept="image/*" onChange={updatePicture} />
              {form.profilePicture && (
                <img src={form.profilePicture} alt="Profile preview" />
              )}
              <small>JPG, PNG or WEBP · maximum 2 MB</small>
            </label>
          )}
          {error && <div className="form-error">{error}</div>}
          <Button className="submit-button" disabled={busy}>
            {busy
              ? "Loading..."
              : register
                ? "Create warrior profile"
                : "Enter the club"}{" "}
            <ArrowUpRight size={17} />
          </Button>
          <button
            type="button"
            className="switch-auth"
            onClick={() => { setRegister(!register); setError(""); }}
          >
            {register
              ? "Already a member? Sign in"
              : "New here? Create your profile"}
          </button>
        </form>
        <div className="secure-note">
          <ShieldCheck size={16} /> Your information is encrypted and never
          shared.
        </div>
      </div>
    </main>
  );
}

const memberLinks = [
  ["dashboard", LayoutDashboard, "Dashboard"],
  ["membership", Trophy, "Membership"],
  ["workout", Dumbbell, "Workout"],
  ["progress", BarChart3, "Progress"],
  ["profile", UserRound, "Profile"],
];
function Shell({ user, owner = false, page, setPage, onLogout, notificationCount = 0, children }) {
  const [open, setOpen] = useState(false);
  const links = owner
    ? [
        ["dashboard", LayoutDashboard, "Overview"],
        ["members", Users, "Members"],
        ["plans", Trophy, "Plans"],
        ["payments", BarChart3, "Payments"],
        ["notifications", Bell, "Notifications"],
      ]
    : memberLinks;
  return (
    <div className={`app-shell ${owner ? "owner-shell" : ""}`}>
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-top">
          <Brand compact />
          <button className="close-menu" onClick={() => setOpen(false)}>
            <X size={19} />
          </button>
        </div>
        {owner ? (
          <div className="owner-label">
            <ShieldCheck size={16} />
            OWNER PORTAL
          </div>
        ) : (
          <div className="member-chip">
            <div className="avatar">{user.name?.slice(0, 2).toUpperCase()}</div>
            <div>
              <b>{user.name}</b>
              <small>MEMBER / WARRIOR</small>
            </div>
          </div>
        )}
        <nav>
          {links.map(([key, Icon, label]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => {
                setPage(key);
                setOpen(false);
              }}
            >
              <Icon size={18} />
              {label}
              {owner && key === "notifications" && notificationCount > 0 && (
                <span className="sidebar-badge">{notificationCount}</span>
              )}
            </button>
          ))}
        </nav>
        <button className="logout" onClick={onLogout}>
          <LogOut size={17} />
          Log out
        </button>
      </aside>
      <section className="workspace">
        <header className="app-header">
          <button className="mobile-menu" onClick={() => setOpen(true)}>
            <Menu size={21} />
          </button>
          <div>
            <span className="kicker">
              {owner
                ? "WARRIORS GYM / OWNER"
                : new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
            </span>
            <h1>
              {owner
                ? {
                    dashboard: "Overview",
                    members: "Members",
                    plans: "Plans",
                    payments: "Payments",
                    notifications: "Notifications",
                  }[page]
                : page === "dashboard"
                  ? `Good morning, ${user.name?.split(" ")[0]}.`
                  : memberLinks.find((x) => x[0] === page)?.[2]}
            </h1>
          </div>
          <div className="header-actions">
            <button
              className="icon-button bell-button"
              title={owner ? `Notifications (${notificationCount})` : "Notifications"}
              onClick={() => {
                if (owner) setPage("notifications");
              }}
            >
              <Bell size={18} />
              {owner && notificationCount > 0 && (
                <span className="bell-badge">{notificationCount}</span>
              )}
            </button>
            <div className="avatar avatar-small">
              {owner ? "AM" : user.name?.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="content">{children}</div>
      </section>
    </div>
  );
}
function MemberApp({ user, onLogout, initialPage = "dashboard", initialPlanId = null }) {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState({
    plans: [],
    membership: null,
    workoutPlan: null,
  });
  const [notice, setNotice] = useState("");
  const refresh = async () => {
    const [a, b, c] = await Promise.all([
      api("/plans"),
      api("/subscription/me"),
      api("/workout-plan/me"),
    ]);
    setData({
      plans: a.plans,
      membership: b.subscription,
      workoutPlan: c.plan,
    });
  };
  useEffect(() => {
    refresh().catch((e) => setNotice(e.message));
  }, []);
  useEffect(() => {
    if (initialPage) setPage(initialPage);
  }, [initialPage]);
  const purchase = async (planId) => {
    let checkout;
    try {
      setNotice("Preparing secure payment order...");
      const order = await api("/payments/orders", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
      if (!window.Razorpay) {
        await new Promise((resolve) => {
          if (window.Razorpay) return resolve();
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => resolve();
          document.body.appendChild(script);
          setTimeout(resolve, 1500);
        });
      }
      if (!window.Razorpay) throw new Error("Payment checkout is unavailable. Please check your internet connection.");
      const razorpayKey = order.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) throw new Error("Razorpay is not configured (missing key ID in environment).");
      checkout = new window.Razorpay({
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || "INR",
        order_id: order.orderId,
        name: "Warriors Gym",
        description: order.planName ? `${order.planName} Membership` : "Gym Membership Plan",
        prefill: {
          name: user?.name || "",
          contact: user?.phone || "",
          email: user?.email || "",
        },
        handler: async (response) => {
          setNotice("Verifying Razorpay payment on server...");
          try {
            await api("/payments/verify", { method: "POST", body: JSON.stringify(response) });
            await refresh();
            setNotice("Payment verified successfully! Your membership is active.");
            setPage("dashboard");
          } catch (error) {
            setNotice(`Payment could not be verified: ${error.message}`);
          }
        },
        modal: { ondismiss: () => setNotice("Checkout cancelled. Your membership was not changed.") },
        theme: { color: "#db321f" },
      });

      checkout.on("payment.failed", async (response) => {
        const errorReason = response?.error?.description || response?.error?.reason || "Payment declined";
        setNotice(`Payment failed: ${errorReason}`);
        try {
          await api("/payments/fail", {
            method: "POST",
            body: JSON.stringify({
              orderId: order.orderId,
              paymentId: response?.error?.metadata?.payment_id,
              reason: errorReason,
            }),
          });
        } catch (_) {}
      });

      checkout.open();
      return true;
    } catch (e) {
      setNotice(e.message);
      throw e;
    }
  };
  const days = data.membership
    ? Math.max(
        0,
        Math.ceil((new Date(data.membership.endDate) - new Date()) / 86400000),
      )
    : 0;
  return (
    <Shell user={user} page={page} setPage={setPage} onLogout={onLogout}>
      {notice && (
        <div className="notice">
          <BadgeCheck size={17} />
          {notice}
          <button onClick={() => setNotice("")}>×</button>
        </div>
      )}
      {page === "dashboard" && (
        <MemberDashboard
          user={user}
          membership={data.membership}
          days={days}
          onPlans={() => setPage("membership")}
        />
      )}
      {page === "membership" && (
        <MembershipPage
          plans={data.plans}
          membership={data.membership}
          days={days}
          onPurchase={purchase}
          initialPlanId={initialPlanId}
        />
      )}
      {page === "workout" && <WorkoutPage workoutPlan={data.workoutPlan} />}
      {page === "progress" && <ProgressPage user={user} />}
      {page === "profile" && <ProfilePage user={user} />}
    </Shell>
  );
}
function MemberDashboard({ user, membership, days, onPlans }) {
  return (
    <div className="dashboard-grid">
      <div className="welcome-banner">
        <div>
          <span className="eyebrow">YOUR DAILY STANDARD</span>
          <h2>Consistency compounds.</h2>
          <p>One good session is a vote for the person you are becoming.</p>
        </div>
        <div className="banner-mark">W</div>
      </div>
      <div className="section-heading">
        <div>
          <span className="kicker">MEMBERSHIP STATUS</span>
          <h2>Your active plan</h2>
        </div>
        <button className="text-action" onClick={onPlans}>
          View all plans <ChevronRight size={16} />
        </button>
      </div>
      {membership && membership.status === "ACTIVE" ? (
        <div className="membership-hero">
          <div>
            <Status status={membership.status} />
            <span className="plan-label">{membership.plan?.name}</span>
            <h3>
              {days}
              <small>days remaining</small>
            </h3>
            <div className="date-line">
              <span>
                START <b>{membership.startDate ? new Date(membership.startDate).toLocaleDateString("en-IN") : "-"}</b>
              </span>
              <span>
                EXPIRES <b>{membership.endDate ? new Date(membership.endDate).toLocaleDateString("en-IN") : "-"}</b>
              </span>
            </div>
            <div style={{ marginTop: 14 }}>
              <Button onClick={onPlans} style={{ padding: "8px 16px", fontSize: 12 }}>
                Renew Membership <ArrowUpRight size={14} />
              </Button>
            </div>
          </div>
          <div className="progress-orb">
            <div>
              <b>
                {Math.min(
                  100,
                  Math.max(
                    5,
                    Math.round(
                      100 -
                        (days / (membership.plan?.duration * 30 || 90)) * 100,
                    ),
                  ),
                )}
                %
              </b>
              <small>complete</small>
            </div>
          </div>
        </div>
      ) : membership && (membership.status === "EXPIRED" || (membership.endDate && new Date(membership.endDate) <= new Date())) ? (
        <div className="empty-panel" style={{ borderLeft: "3px solid #db321f" }}>
          <Status status="EXPIRED" />
          <h3 style={{ marginTop: 10 }}>Membership Expired</h3>
          <p>
            Your {membership.plan?.name || "Warriors Gym"} membership expired on{" "}
            <strong>
              {membership.endDate ? new Date(membership.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "recently"}
            </strong>. Renew your membership to continue your training journey.
          </p>
          <Button onClick={onPlans} style={{ marginTop: 14 }}>
            Renew Membership <ArrowUpRight size={15} />
          </Button>
        </div>
      ) : (
        <div className="empty-panel">
          <Trophy size={25} />
          <h3>No active membership</h3>
          <p>Choose a membership and start training today.</p>
          <Button onClick={onPlans}>Explore plans</Button>
        </div>
      )}
      <div className="quick-grid">
        <Metric
          icon={Zap}
          label="EXPERIENCE"
          value={user.experience || "BEGINNER"}
          foot="Keep progressing"
        />
        <Metric
          icon={Dumbbell}
          label="TRAINING MODE"
          value="CONSISTENT"
          foot="Show up and do the work"
        />
      </div>
    </div>
  );
}
function Metric({ icon: Icon, label, value, foot }) {
  return (
    <div className="metric-card">
      <span className="metric-icon">
        <Icon size={18} />
      </span>
      <small>{label}</small>
      <b>{value}</b>
      <span className="metric-foot">{foot}</span>
    </div>
  );
}
function Intro({ kicker, title, text }) {
  return (
    <div className="page-intro">
      <span className="kicker">{kicker}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
function MembershipPage({ plans, membership, days, onPurchase, initialPlanId = null }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [busy, setBusy] = useState(false);
  const autoTriggeredRef = useRef(false);

  useEffect(() => {
    if (initialPlanId && Array.isArray(plans) && plans.length > 0 && !autoTriggeredRef.current) {
      const matched = plans.find((p) => p.id === initialPlanId);
      if (matched) {
        setSelectedPlan(matched);
        autoTriggeredRef.current = true;
        setBusy(true);
        onPurchase(matched.id)
          .then((opened) => {
            if (opened) setSelectedPlan(null);
          })
          .catch((err) => {
            setPaymentError(err.message);
          })
          .finally(() => {
            setBusy(false);
          });
      }
    }
  }, [initialPlanId, plans]);
  const confirmPayment = async (event) => {
    event.preventDefault();
    setPaymentError("");
    setBusy(true);
    try {
      const opened = await onPurchase(selectedPlan.id);
      if (opened) setSelectedPlan(null);
    } catch (error) {
      setPaymentError(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <Intro
        kicker="MEMBERSHIP"
        title="Make the commitment."
        text="Flexible plans. Serious results. Cancel the excuses."
      />
      {membership && (
        <div className="compact-status">
          <Status status={membership.status} />
          <b>{membership.plan?.name}</b>
          <span>
            {membership.status === "EXPIRED" || (membership.endDate && new Date(membership.endDate) <= new Date())
              ? `Expired on ${membership.endDate ? new Date(membership.endDate).toLocaleDateString("en-IN") : "recently"}`
              : `${days} days left · ends ${membership.endDate ? new Date(membership.endDate).toLocaleDateString("en-IN") : "-"}`}
          </span>
        </div>
      )}
      <div className="plans-grid">
        {plans.map((plan) => (
          <article
            className={`plan-card ${plan.featured ? "featured" : ""}`}
            key={plan.id}
          >
            {plan.featured && <span className="popular">MOST POPULAR</span>}
            <div className="plan-number">0{plan.duration}</div>
            <h3>{plan.name}</h3>
            {plan.description && <p style={{ fontStyle: "italic", marginBottom: 8 }}>{plan.description}</p>}
            <p>
              For {plan.duration} {plan.durationUnit?.toLowerCase() || "months"} of focused work.
            </p>
            <strong>{money.format(plan.price)}</strong>
            <ul>
              {(plan.features || []).map((f) => (
                <li key={f}>
                  <BadgeCheck size={15} />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant={plan.featured ? "primary" : "dark"}
              onClick={() => { setSelectedPlan(plan); setPaymentError(""); }}
            >
              Choose plan <ArrowUpRight size={15} />
            </Button>
          </article>
        ))}
      </div>
      {selectedPlan && (
        <div className="modal-backdrop" onClick={() => setSelectedPlan(null)}>
          <form className="payment-modal" onSubmit={confirmPayment} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelectedPlan(null)}><X size={18} /></button>
            <span className="kicker">SECURE CHECKOUT</span>
            <h3>Complete your payment.</h3>
            <p>{selectedPlan.name} · {money.format(selectedPlan.price)}</p>
            <div className="cash-note">Razorpay securely supports UPI, cards, net banking, and wallets. Your membership activates only after server verification.</div>
            {paymentError && (
              <div className="form-error" style={{ margin: "14px 0", textAlign: "left", lineHeight: 1.4 }}>
                {paymentError}
              </div>
            )}
            <Button className="payment-submit" disabled={busy}>
              {busy ? "Opening secure checkout..." : "Subscribe Now / Pay Now"}{" "}
              <BadgeCheck size={16} />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
function WorkoutPage({ workoutPlan }) {
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(daysOfWeek[currentDayIndex]);

  const currentDayData = workoutPlan?.days?.find((d) => d.day === selectedDay);

  return (
    <div>
      <Intro
        kicker="WEEKLY TRAINING PLAN"
        title="Show up. Do the work."
        text={workoutPlan ? "Your customized coach routine from Warriors Gym." : "Assigned weekly routine."}
      />
      {!workoutPlan || !workoutPlan.days || workoutPlan.days.length === 0 ? (
        <div className="empty-panel">
          <Dumbbell size={28} />
          <h3>No workout plan assigned yet.</h3>
          <p>Your weekly training routine has not been assigned by the coach yet. Please contact your trainer or gym owner.</p>
        </div>
      ) : (
        <div>
          <div className="filter-pills" style={{ marginBottom: 20, flexWrap: "wrap" }}>
            {daysOfWeek.map((day) => {
              const dayHasExercises = workoutPlan.days.some((d) => d.day === day && d.exercises && d.exercises.length > 0);
              return (
                <button
                  key={day}
                  className={selectedDay === day ? "selected" : ""}
                  onClick={() => setSelectedDay(day)}
                >
                  {day} {dayHasExercises ? "✦" : ""}
                </button>
              );
            })}
          </div>
          <div className="table-panel" style={{ padding: 25 }}>
            <div className="panel-title" style={{ marginBottom: 18 }}>
              <div>
                <span className="kicker">{selectedDay.toUpperCase()} ROUTINE</span>
                <h3 style={{ fontSize: 20, marginTop: 4 }}>{currentDayData?.title || "Rest / Active Recovery"}</h3>
                {currentDayData?.muscleGroup && (
                  <p style={{ color: "#db321f", fontSize: 12, marginTop: 4, fontFamily: "DM Mono", letterSpacing: "0.1em" }}>
                    MUSCLE GROUP: {currentDayData.muscleGroup.toUpperCase()}
                  </p>
                )}
              </div>
            </div>
            {!currentDayData || !currentDayData.exercises || currentDayData.exercises.length === 0 ? (
              <div className="empty-panel" style={{ padding: "30px 20px" }}>
                <p>No exercises scheduled for {selectedDay}. Rest and recover.</p>
              </div>
            ) : (
              <div className="workout-list">
                {currentDayData.exercises.map((ex, idx) => (
                  <div className="workout-row" key={idx}>
                    <span className="workout-day">0{idx + 1}</span>
                    <div>
                      <b style={{ fontSize: 14 }}>{ex.name}</b>
                      <p style={{ fontSize: 12, color: "#8b857a", marginTop: 4 }}>
                        {ex.sets} sets × {ex.reps} reps
                        {ex.weight ? ` · ${ex.weight}` : ""}
                        {ex.rest ? ` · Rest: ${ex.rest}` : ""}
                      </p>
                      {ex.notes && (
                        <small style={{ color: "#a59e92", fontStyle: "italic", display: "block", marginTop: 2 }}>
                          {ex.notes}
                        </small>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function ProgressPage() {
  return (
    <div>
      <Intro
        kicker="TRAINING PROGRESS"
        title="Keep building momentum."
        text="Small, consistent sessions add up to lasting strength."
      />
      <div className="progress-card">
        <div>
          <span className="kicker">CURRENT TARGET</span>
          <h3>
            Progress is not a feeling.
            <br />
            It is a practice.
          </h3>
        </div>
        <div className="target-ring">
          <span>
            <b>100%</b>
            <small>commitment</small>
          </span>
        </div>
        <div className="target-arrow">→</div>
        <div className="target-ring target-ring-muted">
          <span>
            <b>
              1%
            </b>
            <small>next session</small>
          </span>
        </div>
      </div>
    </div>
  );
}
function ProfilePage({ user }) {
  const [profilePicture, setProfilePicture] = useState(user.profilePicture || "");
  const [pictureMessage, setPictureMessage] = useState("");
  const updateProfilePicture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setPictureMessage("Please choose an image smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api("/auth/profile", {
          method: "PUT",
          body: JSON.stringify({ profilePicture: reader.result }),
        });
        setProfilePicture(reader.result);
        setPictureMessage("Profile picture updated.");
      } catch (error) {
        setPictureMessage(error.message);
      }
    };
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <Intro
        kicker="YOUR PROFILE"
        title="The details behind the work."
        text="Keep your baseline current so your plans stay useful."
      />
      <div className="profile-card">
        <div className="profile-picture-wrap">
          {profilePicture ? (
            <img className="profile-large-avatar profile-photo" src={profilePicture} alt={`${user.name} profile`} />
          ) : (
            <div className="profile-large-avatar">{user.name?.slice(0, 2).toUpperCase()}</div>
          )}
          <label className="change-picture">
            Change photo
            <input type="file" accept="image/*" onChange={updateProfilePicture} />
          </label>
          {pictureMessage && <small className="picture-message">{pictureMessage}</small>}
        </div>
        <div>
          <span className="kicker">WARRIOR PROFILE</span>
          <h3>{user.name}</h3>
          <p>
            Member since{" "}
            {new Date(user.createdAt).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Status status={user.isActive ? "ACTIVE" : "INACTIVE"} />
      </div>
      <div className="profile-fields">
        {[
          ["PHONE", user.phone],
          ["VILLAGE / LOCALITY", user.village || "Not added"],
          ["EXPERIENCE", user.experience || "BEGINNER"],
        ].map(([k, v]) => (
          <div key={k}>
            <small>{k}</small>
            <b>{v}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function toDateInputValue(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function computePlanEndDate(startDateStr, plan) {
  if (!plan || !startDateStr) return "";
  const parts = startDateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "";
  const [y, m, d] = parts;
  const end = new Date(y, m - 1, d);
  const unit = String(plan.durationUnit || "MONTHS").toUpperCase();
  const dur = Number(plan.duration) || 1;
  if (unit === "DAYS") {
    end.setDate(end.getDate() + dur);
  } else if (unit === "YEARS") {
    end.setFullYear(end.getFullYear() + dur);
  } else {
    end.setMonth(end.getMonth() + dur);
  }
  return toDateInputValue(end);
}

function AddMemberModal({ plans, onClose, onCreate }) {
  const todayStr = toDateInputValue(new Date());
  const [form, setForm] = useState({
    name: "",
    phone: "",
    village: "",
    profilePicture: "",
    experience: "BEGINNER",
    password: "",
    planId: "",
    startDate: todayStr,
    endDate: "",
    paymentMethod: "CASH",
    notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePlanChange = (e) => {
    const nextPlanId = e.target.value;
    const plan = plans.find((p) => p.id === nextPlanId);
    const start = form.startDate || todayStr;
    const end = computePlanEndDate(start, plan);
    setForm((prev) => ({
      ...prev,
      planId: nextPlanId,
      startDate: start,
      endDate: end,
    }));
  };

  const handleStartDateChange = (e) => {
    const nextStart = e.target.value;
    const plan = plans.find((p) => p.id === form.planId);
    const nextEnd = computePlanEndDate(nextStart, plan);
    setForm((prev) => ({
      ...prev,
      startDate: nextStart,
      endDate: nextEnd || prev.endDate,
    }));
  };

  const handleEndDateChange = (e) => {
    setForm((prev) => ({ ...prev, endDate: e.target.value }));
  };

  const updatePicture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setError("Please choose an image smaller than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, profilePicture: reader.result });
    reader.readAsDataURL(file);
  };

  const selectedPlan = plans.find((p) => p.id === form.planId);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Full name is required.");
    if (!/^[6-9][0-9]{9}$/.test(form.phone.trim())) return setError("Enter a valid 10-digit Indian mobile number.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");

    if (form.planId) {
      if (!form.startDate || !form.endDate) {
        return setError("Please select both a start date and end date.");
      }
      if (form.endDate <= form.startDate) {
        return setError("End date must be after start date.");
      }
    }

    setBusy(true);
    try {
      await onCreate(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="payment-modal"
        style={{ width: "min(650px, 100%)", maxHeight: "90vh", overflowY: "auto" }}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>
        <span className="kicker">NEW WARRIOR</span>
        <h3>Add member to gym.</h3>
        <p>Create member account and optionally assign a live membership plan.</p>

        {error && <div className="form-error" style={{ margin: "14px 0" }}>{error}</div>}

        <div className="field-row" style={{ marginTop: 15 }}>
          <label>
            Full Name *
            <input name="name" value={form.name} onChange={update} placeholder="e.g. Shiva Prajapati" required />
          </label>
          <label>
            Phone Number (10 Digits) *
            <input name="phone" value={form.phone} onChange={update} placeholder="9876543210" required />
          </label>
        </div>

        <div className="field-row">
          <label>
            Village / Locality
            <input name="village" value={form.village} onChange={update} placeholder="Village or locality name" />
          </label>
          <label>
            Experience Level
            <select name="experience" value={form.experience} onChange={update} style={{ background: "transparent", border: 0, borderBottom: "1px solid #c9c3b9", padding: "14px 0", color: "#24221f" }}>
              <option value="BEGINNER">BEGINNER</option>
              <option value="INTERMEDIATE">INTERMEDIATE</option>
              <option value="ADVANCED">ADVANCED</option>
            </select>
          </label>
        </div>

        <div className="field-row">
          <label>
            Account Password (For Member Login) *
            <input name="password" type="password" value={form.password} onChange={update} placeholder="Min 8 characters" required />
          </label>
          <label className="picture-upload">
            Profile Photo (Optional)
            <input type="file" accept="image/*" onChange={updatePicture} />
            {form.profilePicture && <img src={form.profilePicture} alt="Preview" />}
          </label>
        </div>

        <div style={{ marginTop: 20, paddingTop: 15, borderTop: "1px solid #ded9d0" }}>
          <span className="kicker">MEMBERSHIP & PAYMENT</span>
          <label style={{ marginTop: 10 }}>
            Select Membership Plan (From MongoDB)
            <select name="planId" value={form.planId} onChange={handlePlanChange} style={{ background: "transparent", border: 0, borderBottom: "1px solid #c9c3b9", padding: "14px 0", color: "#24221f", width: "100%" }}>
              <option value="">-- No plan initially (Member will choose later) --</option>
              {plans.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.duration} {p.durationUnit?.toLowerCase() || "months"} · {money.format(p.price)}
                </option>
              ))}
            </select>
          </label>

          {selectedPlan && (
            <div className="cash-note" style={{ marginTop: 15 }}>
              <b>Plan Details:</b>
              <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>Price: <b>{money.format(selectedPlan.price)}</b></div>
                <div>Duration: <b>{selectedPlan.duration} {selectedPlan.durationUnit?.toLowerCase() || "months"}</b></div>
              </div>

              <div className="field-row" style={{ marginTop: 14 }}>
                <label style={{ margin: 0 }}>
                  Membership Start Date *
                  <input
                    type="date"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleStartDateChange}
                    required
                  />
                </label>
                <label style={{ margin: 0 }}>
                  Membership End Date (Expiry) *
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleEndDateChange}
                    min={form.startDate}
                    required
                  />
                </label>
              </div>

              <div style={{ marginTop: 15 }}>
                <span className="kicker" style={{ color: "#716a60" }}>PAYMENT METHOD</span>
                <div style={{ display: "flex", gap: 15, marginTop: 8 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, cursor: "pointer" }}>
                    <input type="radio" name="paymentMethod" value="CASH" checked={form.paymentMethod === "CASH"} onChange={update} style={{ width: "auto", margin: 0 }} />
                    <b>CASH (Owner Confirms Received)</b>
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, cursor: "pointer" }}>
                    <input type="radio" name="paymentMethod" value="ONLINE" checked={form.paymentMethod === "ONLINE"} onChange={update} style={{ width: "auto", margin: 0 }} />
                    <span>ONLINE (Pending Razorpay)</span>
                  </label>
                </div>
              </div>

              {form.paymentMethod === "CASH" ? (
                <div style={{ marginTop: 12 }}>
                  <small style={{ color: "#246338", display: "block", marginBottom: 6 }}>
                    ✓ Confirmed cash received: {money.format(selectedPlan.price)}. Subscription will activate immediately.
                  </small>
                  <input
                    name="notes"
                    value={form.notes}
                    onChange={update}
                    placeholder="Cash payment reference or note (e.g. Received at reception)"
                    style={{ fontSize: 12 }}
                  />
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <small style={{ color: "#9a2015", display: "block" }}>
                    Pending online payment. Member will complete Razorpay verification when signing in.
                  </small>
                </div>
              )}
            </div>
          )}
        </div>

        <Button className="submit-button" disabled={busy} style={{ marginTop: 22 }}>
          {busy ? "Saving to MongoDB..." : "Create member"} <BadgeCheck size={16} />
        </Button>
      </form>
    </div>
  );
}

function MemberDetailModal({
  member,
  plans,
  onClose,
  onRecordCashPayment,
  onSaveWorkoutPlan,
  onSendReminder,
}) {
  const [tab, setTab] = useState("profile"); // 'profile' | 'workout' | 'cash'
  const [reminderBusy, setReminderBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  // Cash renewal state
  const [cashPlanId, setCashPlanId] = useState("");
  const [cashStartDate, setCashStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cashEndDate, setCashEndDate] = useState("");
  const [cashBusy, setCashBusy] = useState(false);

  // Workout editor state (Monday - Sunday)
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [workoutDays, setWorkoutDays] = useState(() => {
    const existing = member.workoutPlan?.days || [];
    return daysOfWeek.map((day) => {
      const found = existing.find((d) => d.day === day);
      return {
        day,
        title: found?.title || "",
        muscleGroup: found?.muscleGroup || "",
        exercises: found?.exercises ? found.exercises.map((e) => ({ ...e })) : [],
      };
    });
  });
  const [workoutBusy, setWorkoutBusy] = useState(false);

  const currentDayWorkout = workoutDays.find((d) => d.day === selectedDay);

  const updateDayField = (field, val) => {
    setWorkoutDays(
      workoutDays.map((d) => (d.day === selectedDay ? { ...d, [field]: val } : d))
    );
  };

  const addExercise = () => {
    const newEx = { name: "", sets: 3, reps: "10", weight: "", rest: "", notes: "" };
    setWorkoutDays(
      workoutDays.map((d) =>
        d.day === selectedDay ? { ...d, exercises: [...d.exercises, newEx] } : d
      )
    );
  };

  const updateExercise = (idx, field, val) => {
    setWorkoutDays(
      workoutDays.map((d) => {
        if (d.day !== selectedDay) return d;
        const updatedEx = [...d.exercises];
        updatedEx[idx] = { ...updatedEx[idx], [field]: val };
        return { ...d, exercises: updatedEx };
      })
    );
  };

  const removeExercise = (idx) => {
    setWorkoutDays(
      workoutDays.map((d) => {
        if (d.day !== selectedDay) return d;
        return { ...d, exercises: d.exercises.filter((_, i) => i !== idx) };
      })
    );
  };

  const saveWorkout = async () => {
    setWorkoutBusy(true);
    setFeedback("");
    try {
      await onSaveWorkoutPlan(member.id, workoutDays);
      setFeedback("Weekly workout plan saved in MongoDB.");
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setWorkoutBusy(false);
    }
  };

  const submitCashPayment = async (e) => {
    e.preventDefault();
    if (!cashPlanId) return setFeedback("Please select a plan to assign.");
    if (!cashStartDate) return setFeedback("Please select a start date.");
    if (!cashEndDate) return setFeedback("Please select an end date.");
    if (new Date(cashEndDate) <= new Date(cashStartDate)) return setFeedback("End date must be after start date.");
    setCashBusy(true);
    setFeedback("");
    try {
      await onRecordCashPayment(member.id, cashPlanId, cashStartDate, cashEndDate);
      setFeedback("Cash payment recorded and subscription activated successfully.");
      setCashPlanId("");
      setCashStartDate(new Date().toISOString().slice(0, 10));
      setCashEndDate("");
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setCashBusy(false);
    }
  };

  const triggerReminder = async () => {
    setReminderBusy(true);
    setFeedback("");
    try {
      const res = await onSendReminder(member.id);
      setFeedback(res?.message || "WhatsApp opened. Press Send in WhatsApp to deliver.");
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setReminderBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="payment-modal"
        style={{ width: "min(780px, 100%)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose}><X size={18} /></button>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 15 }}>
          {member.profilePicture ? (
            <img src={member.profilePicture} alt={member.name} style={{ width: 50, height: 50, borderRadius: "50%", objectFit: "cover", border: "2px solid #db321f" }} />
          ) : (
            <div className="avatar" style={{ width: 50, height: 50, fontSize: 16 }}>{member.name.slice(0, 2).toUpperCase()}</div>
          )}
          <div>
            <span className="kicker">MEMBER DETAILS</span>
            <h3 style={{ margin: 0 }}>{member.name}</h3>
            <small style={{ color: "#767067", fontFamily: "DM Mono" }}>{member.phone}</small>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Status status={member.membership?.status || "NONE"} />
          </div>
        </div>

        {feedback && (
          <div className="notice" style={{ margin: "14px 0", padding: "10px 14px", fontSize: 12 }}>
            <BadgeCheck size={16} />
            <span>{feedback}</span>
            <button onClick={() => setFeedback("")}>×</button>
          </div>
        )}

        <div className="filter-pills" style={{ marginBottom: 20 }}>
          <button className={tab === "profile" ? "selected" : ""} onClick={() => setTab("profile")}>Profile & Membership</button>
          <button className={tab === "workout" ? "selected" : ""} onClick={() => setTab("workout")}>Weekly Workout Plan</button>
          <button className={tab === "cash" ? "selected" : ""} onClick={() => setTab("cash")}>+ Record Cash Plan</button>
        </div>

        {tab === "profile" && (
          <div>
            <div className="profile-fields" style={{ marginBottom: 22 }}>
              <div><small>PHONE</small><b>{member.phone}</b></div>
              <div><small>VILLAGE / LOCALITY</small><b>{member.village || "Not added"}</b></div>
              <div><small>EXPERIENCE</small><b>{member.experience || "BEGINNER"}</b></div>
              <div><small>JOINED</small><b>{new Date(member.createdAt).toLocaleDateString("en-IN")}</b></div>
              <div><small>ACCOUNT STATUS</small><b>{member.isActive ? "ACTIVE" : "INACTIVE"}</b></div>
            </div>

            <div className="cash-note" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="kicker">CURRENT SUBSCRIPTION</span>
                  <h4 style={{ margin: "4px 0", fontSize: 16 }}>{member.membership?.plan?.name || "No active membership"}</h4>
                  {member.membership?.startDate && (
                    <p style={{ fontSize: 12, color: "#615b53", marginTop: 4 }}>
                      {new Date(member.membership.startDate).toLocaleDateString("en-IN")} → {new Date(member.membership.endDate).toLocaleDateString("en-IN")}
                      {member.membership.endDate && ` · ${Math.max(0, Math.ceil((new Date(member.membership.endDate) - new Date()) / 86400000))} days remaining`}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={triggerReminder}
                  disabled={reminderBusy}
                  style={{ fontSize: 10, padding: "8px 12px" }}
                >
                  {reminderBusy ? "Opening WhatsApp..." : "Send WhatsApp reminder"}
                </Button>
              </div>
            </div>

            <span className="kicker">VERIFIED PAYMENT HISTORY</span>
            {member.payments && member.payments.length > 0 ? (
              <div className="member-table" style={{ marginTop: 10 }}>
                <div className="table-head">
                  <span>PLAN</span>
                  <span>METHOD</span>
                  <span>AMOUNT</span>
                  <span>STATUS</span>
                </div>
                {member.payments.map((payment) => (
                  <div className="table-row" key={payment.id}>
                    <div>
                      <b>{payment.plan?.name || "Membership"}</b>
                      <small style={{ color: "#8a8479", display: "block", marginTop: 2 }}>
                        {new Date(payment.createdAt).toLocaleDateString("en-IN")}
                      </small>
                    </div>
                    <span>{payment.paymentMethod || (payment.razorpayPaymentId ? "RAZORPAY" : "ONLINE")}</span>
                    <b>{money.format(payment.amount)}</b>
                    <Status status={payment.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#8b857a", fontSize: 12, marginTop: 8 }}>No payment records for this member yet.</p>
            )}
          </div>
        )}

        {tab === "workout" && (
          <div>
            <p style={{ fontSize: 13, color: "#787269", marginBottom: 15 }}>
              Assign and edit the complete weekly workout schedule for <b>{member.name}</b>.
            </p>

            <div className="filter-pills" style={{ marginBottom: 16, flexWrap: "wrap" }}>
              {daysOfWeek.map((day) => {
                const hasEx = workoutDays.find((d) => d.day === day)?.exercises?.length > 0;
                return (
                  <button
                    key={day}
                    className={selectedDay === day ? "selected" : ""}
                    onClick={() => setSelectedDay(day)}
                  >
                    {day} {hasEx ? "✦" : ""}
                  </button>
                );
              })}
            </div>

            <div style={{ background: "#ede8df", padding: 18, marginBottom: 15, borderRadius: 2 }}>
              <div className="field-row">
                <label>
                  Workout Title
                  <input
                    value={currentDayWorkout?.title || ""}
                    onChange={(e) => updateDayField("title", e.target.value)}
                    placeholder="e.g. Chest + Triceps"
                  />
                </label>
                <label>
                  Muscle Group
                  <input
                    value={currentDayWorkout?.muscleGroup || ""}
                    onChange={(e) => updateDayField("muscleGroup", e.target.value)}
                    placeholder="e.g. Upper Body Pushing"
                  />
                </label>
              </div>

              <div style={{ marginTop: 15 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span className="kicker">EXERCISES ({currentDayWorkout?.exercises?.length || 0})</span>
                  <button
                    type="button"
                    className="text-action"
                    onClick={addExercise}
                    style={{ color: "#24231f", fontWeight: 800, fontSize: 11, cursor: "pointer" }}
                  >
                    + Add exercise
                  </button>
                </div>

                <div className="exercises-box" style={{ background: "#fbf9f5", border: "1px solid #ddd7cc", padding: 12, borderRadius: 2 }}>
                  {currentDayWorkout?.exercises?.map((ex, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.6fr 0.8fr 0.8fr 1fr auto", gap: 8, alignItems: "center", marginBottom: 8, background: "#fff", padding: 8, border: "1px solid #ddd7cc" }}>
                      <input value={ex.name} onChange={(e) => updateExercise(idx, "name", e.target.value)} placeholder="Exercise name" required style={{ margin: 0, padding: 6, fontSize: 12 }} />
                      <input type="number" min="1" value={ex.sets} onChange={(e) => updateExercise(idx, "sets", e.target.value)} placeholder="Sets" style={{ margin: 0, padding: 6, fontSize: 12 }} />
                      <input value={ex.reps} onChange={(e) => updateExercise(idx, "reps", e.target.value)} placeholder="Reps (e.g. 10)" style={{ margin: 0, padding: 6, fontSize: 12 }} />
                      <input value={ex.weight} onChange={(e) => updateExercise(idx, "weight", e.target.value)} placeholder="Weight" style={{ margin: 0, padding: 6, fontSize: 12 }} />
                      <input value={ex.notes} onChange={(e) => updateExercise(idx, "notes", e.target.value)} placeholder="Notes / Rest" style={{ margin: 0, padding: 6, fontSize: 12 }} />
                      <button type="button" onClick={() => removeExercise(idx)} style={{ background: "transparent", color: "#a33124", cursor: "pointer", border: 0 }}>
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  {(!currentDayWorkout?.exercises || currentDayWorkout.exercises.length === 0) && (
                    <p style={{ color: "#7a746a", fontSize: 12, margin: "4px 0 10px 0" }}>No exercises scheduled for {selectedDay}.</p>
                  )}

                  <button
                    type="button"
                    className="add-exercise-btn"
                    onClick={addExercise}
                  >
                    + Add exercise
                  </button>
                </div>
              </div>
            </div>

            <Button type="button" onClick={saveWorkout} disabled={workoutBusy}>
              {workoutBusy ? "Saving..." : "Save weekly workout plan"} <BadgeCheck size={16} />
            </Button>
          </div>
        )}

        {tab === "cash" && (
          <form onSubmit={submitCashPayment}>
            <p style={{ fontSize: 13, color: "#787269", marginBottom: 15 }}>
              Record a direct cash payment for <b>{member.name}</b> and immediately activate their membership in MongoDB.
            </p>

            <label>
              Select Plan to Assign / Renew
              <select
                value={cashPlanId}
                onChange={(e) => {
                  const newPlanId = e.target.value;
                  setCashPlanId(newPlanId);
                  // Auto-calculate end date from the selected plan's real duration
                  if (newPlanId && cashStartDate) {
                    const selectedPlan = plans.find((p) => p.id === newPlanId);
                    if (selectedPlan) {
                      const start = new Date(cashStartDate);
                      const end = new Date(start);
                      const unit = (selectedPlan.durationUnit || "MONTHS").toUpperCase();
                      const dur = Number(selectedPlan.duration || 1);
                      if (unit === "DAYS") end.setDate(end.getDate() + dur);
                      else if (unit === "YEARS") end.setFullYear(end.getFullYear() + dur);
                      else end.setMonth(end.getMonth() + dur);
                      setCashEndDate(end.toISOString().slice(0, 10));
                    }
                  } else if (!newPlanId) {
                    setCashEndDate("");
                  }
                }}
                required
                style={{ background: "transparent", border: 0, borderBottom: "1px solid #c9c3b9", padding: "14px 0", color: "#24221f", width: "100%" }}
              >
                <option value="">-- Choose active plan --</option>
                {plans.filter((p) => p.active).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.duration} {p.durationUnit?.toLowerCase() || "months"} · {money.format(p.price)}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ marginTop: 15 }}>
              Start Date
              <input
                type="date"
                value={cashStartDate}
                onChange={(e) => {
                  const newStart = e.target.value;
                  setCashStartDate(newStart);
                  // Recalculate end date when start date changes, if a plan is selected
                  if (newStart && cashPlanId) {
                    const selectedPlan = plans.find((p) => p.id === cashPlanId);
                    if (selectedPlan) {
                      const start = new Date(newStart);
                      const end = new Date(start);
                      const unit = (selectedPlan.durationUnit || "MONTHS").toUpperCase();
                      const dur = Number(selectedPlan.duration || 1);
                      if (unit === "DAYS") end.setDate(end.getDate() + dur);
                      else if (unit === "YEARS") end.setFullYear(end.getFullYear() + dur);
                      else end.setMonth(end.getMonth() + dur);
                      setCashEndDate(end.toISOString().slice(0, 10));
                    }
                  }
                }}
                required
                style={{ background: "transparent", border: 0, borderBottom: "1px solid #c9c3b9", padding: "14px 0", color: "#24221f", width: "100%" }}
              />
            </label>

            <label style={{ marginTop: 15 }}>
              End Date
              <input
                type="date"
                value={cashEndDate}
                min={cashStartDate || undefined}
                onChange={(e) => setCashEndDate(e.target.value)}
                required
                style={{ background: "transparent", border: 0, borderBottom: "1px solid #c9c3b9", padding: "14px 0", color: "#24221f", width: "100%" }}
              />
            </label>

            <Button type="submit" disabled={cashBusy} style={{ marginTop: 20 }}>
              {cashBusy ? "Recording..." : "Confirm cash payment & activate"} <BadgeCheck size={16} />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function OwnerApp({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState({
    stats: {},
    members: [],
    plans: [],
    payments: [],
    notifications: [],
  });
  const [selectedMember, setSelectedMember] = useState(null);
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    try {
      const [a, b, c, d, e] = await Promise.all([
        api("/admin/dashboard"),
        api("/members"),
        api("/admin/plans"),
        api("/payments"),
        api("/admin/notifications"),
      ]);
      setData({
        stats: a,
        members: b.members || [],
        plans: c.plans || [],
        payments: d.payments || [],
        notifications: e.notifications || [],
      });
    } catch (err) {
      setNotice(err.message || "Failed to sync latest data");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const removeMember = async (member) => {
    try {
      await api(`/members/${member.id}`, { method: "DELETE" });
      await refresh();
      setNotice(`Member ${member.name} permanently removed from MongoDB.`);
    } catch (error) {
      window.alert(error.message);
      throw error;
    }
  };

  const viewMember = async (member) => {
    try {
      const response = await api(`/members/${member.id}`);
      setSelectedMember(response.member);
    } catch (error) {
      window.alert(error.message);
    }
  };

  const createMember = async (memberData) => {
    if (memberData?.password && memberData?.phone) {
      setMemberCreationPassword(memberData.phone, memberData.password);
    }
    const res = await api("/members", { method: "POST", body: JSON.stringify(memberData) });
    if (res?.member?.id && memberData?.password) {
      setMemberCreationPassword(res.member.id, memberData.password);
    }
    await refresh();
    setNotice("Member created and saved in MongoDB.");
  };

  const openWhatsAppUrl = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const sendReminder = async (memberId) => {
    try {
      const response = await api(`/members/${memberId}/send-reminder`, { method: "POST" });
      await refresh();
      if (response?.waUrl) {
        openWhatsAppUrl(response.waUrl);
      }
      setNotice(response.message || "WhatsApp opened. Press Send in WhatsApp to deliver.");
      return response;
    } catch (err) {
      setNotice(err.message);
      throw err;
    }
  };

  const sendWelcome = async (member) => {
    const creationPwd = getMemberCreationPassword(member?.phone) || getMemberCreationPassword(member?.id);
    try {
      const response = await api(`/members/${member.id}/send-welcome`, {
        method: "POST",
        body: JSON.stringify({ password: creationPwd || null }),
      });
      if (response?.waUrl) {
        openWhatsAppUrl(response.waUrl);
      }
      setNotice(response.message || `WhatsApp welcome message prepared for ${member.name}. Press Send in WhatsApp to deliver.`);
      return response;
    } catch {
      const waUrl = buildWelcomeWhatsAppUrl(member, data.plans, creationPwd);
      openWhatsAppUrl(waUrl);
      setNotice(`WhatsApp opened with welcome message for ${member.name}. Press Send in WhatsApp to deliver.`);
    }
  };

  const recordCashPayment = async (memberId, planId, startDate, endDate) => {
    await api(`/members/${memberId}/subscription/cash`, {
      method: "POST",
      body: JSON.stringify({ planId, startDate, endDate }),
    });
    await refresh();
    const updated = await api(`/members/${memberId}`);
    setSelectedMember(updated.member);
  };

  const saveWorkoutPlan = async (memberId, days) => {
    const res = await api(`/members/${memberId}/workout-plan`, {
      method: "PUT",
      body: JSON.stringify({ days }),
    });
    setSelectedMember((prev) => (prev ? { ...prev, workoutPlan: res.plan } : null));
    await refresh();
  };



  const markNotificationRead = async (id) => {
    try {
      await api(`/admin/notifications/${id}/read`, { method: "PUT" });
      await refresh();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const sendNotificationReminder = async (id) => {
    try {
      const res = await api(`/admin/notifications/${id}/send-reminder`, { method: "POST" });
      await refresh();
      if (res?.waUrl) {
        openWhatsAppUrl(res.waUrl);
      }
      setNotice(res.message || "WhatsApp opened. Press Send in WhatsApp to deliver.");
    } catch (err) {
      setNotice(err.message);
    }
  };

  const notificationCount = (data.notifications || []).filter((n) => !n.read).length;

  return (
    <Shell user={user} owner page={page} setPage={setPage} onLogout={onLogout} notificationCount={notificationCount}>
      {notice && <div className="notice"><BadgeCheck size={17} />{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {page === "dashboard" && (
        <OwnerDashboard
          stats={data.stats?.stats}
          members={data.members}
          recentPayments={data.stats?.recentPayments}
          recentMembers={data.stats?.recentMembers}
        />
      )}
      {page === "members" && (
        <MembersPage
          members={data.members}
          plans={data.plans}
          onRemove={removeMember}
          onView={viewMember}
          onCreate={createMember}
          onSendReminder={sendReminder}
          onSendWelcome={sendWelcome}
          onRecordCashPayment={recordCashPayment}
          onSaveWorkoutPlan={saveWorkoutPlan}
          selectedMember={selectedMember}
          onCloseDetail={() => setSelectedMember(null)}
        />
      )}
      {page === "plans" && <OwnerPlans plans={data.plans} onRefresh={refresh} setNotice={setNotice} />}
      {page === "payments" && <PaymentsPage payments={data.payments} />}
      {page === "notifications" && (
        <NotificationsPage
          notifications={data.notifications || []}
          onViewMember={viewMember}
          onSendReminder={sendNotificationReminder}
          onMarkRead={markNotificationRead}
        />
      )}

      {selectedMember && page !== "members" && (
        <MemberDetailModal
          member={selectedMember}
          plans={data.plans}
          onClose={() => setSelectedMember(null)}
          onRecordCashPayment={recordCashPayment}
          onSaveWorkoutPlan={saveWorkoutPlan}
          onSendReminder={sendReminder}
        />
      )}
    </Shell>
  );
}

function OwnerDashboard({ stats = {}, members, recentPayments = [], recentMembers = [] }) {
  return (
    <div>
      <div className="owner-topline">
        <div>
          <span className="kicker">COMMAND CENTER</span>
          <h2>Make the numbers move.</h2>
          <p>Every member is a story in progress.</p>
        </div>
        <div className="live-dot">
          <i />
          SYSTEMS LIVE
        </div>
      </div>
      <div className="owner-stats">
        {[
          ["TOTAL MEMBERS", stats.totalMembers || 0, Users],
          ["ACTIVE MEMBERS", stats.activeMembers || 0, Zap],
          ["EXPIRED MEMBERS", stats.expiredMembers || 0, X],
          ["EXPIRING SOON", stats.expiringSoon || 0, Bell],
          ["REVENUE", money.format(stats.revenue || 0), BarChart3],
        ].map(([l, v, Icon]) => (
          <div className="owner-stat" key={l}>
            <span>
              <Icon size={17} />
            </span>
            <small>{l}</small>
            <b>{v}</b>
            <em>LIVE FROM MONGODB</em>
          </div>
        ))}
      </div>
      <div className="owner-grid">
        <div className="chart-panel">
          <div className="panel-title">
            <div>
              <span className="kicker">RECENT REGISTRATIONS</span>
              <h3>New members</h3>
            </div>
            <span className="chart-value">LIVE DATA</span>
          </div>
          <div className="workout-list">
            {recentMembers.slice(0, 5).map((member) => (
              <div className="workout-row" key={member.id}>
                <span className="workout-day">NEW</span>
                <div>
                  <b>{member.name}</b>
                  <p>Joined {new Date(member.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="members-panel">
          <div className="panel-title">
            <div>
              <span className="kicker">RECENT MEMBERS</span>
              <h3>People in motion</h3>
            </div>
          </div>
          {(recentMembers.length ? recentMembers : members).slice(0, 4).map((m) => (
            <div className="mini-member" key={m.id}>
              <div className="avatar">{m.name.slice(0, 2).toUpperCase()}</div>
              <div>
                <b>{m.name}</b>
                <small>{m.experience || "BEGINNER"}</small>
              </div>
              <span>{m.membership?.status || "NONE"}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="table-panel owner-recent-payments">
        <div className="panel-title">
          <div>
            <span className="kicker">RECENT PAYMENTS</span>
            <h3>Verified transactions</h3>
          </div>
        </div>
        <div className="member-table">
          {recentPayments.slice(0, 5).map((payment) => (
            <div className="table-row" key={payment.id}>
              <span>{payment.member?.name || "Member"}</span>
              <span>{payment.plan?.name || "Plan"}</span>
              <b>{money.format(payment.amount)}</b>
              <Status status={payment.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MembersPage({
  members,
  plans,
  onRemove,
  onView,
  onCreate,
  onSendReminder,
  onSendWelcome,
  onRecordCashPayment,
  onSaveWorkoutPlan,
  selectedMember,
  onCloseDetail,
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all"); // 'all' | 'active' | 'expired'
  const [showAddModal, setShowAddModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!previewPhoto && !memberToDelete) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (!deleteBusy) setMemberToDelete(null);
        setPreviewPhoto(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewPhoto, memberToDelete, deleteBusy]);

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringMembers = members.filter((m) => {
    if (!m.membership?.endDate) return false;
    const end = new Date(m.membership.endDate);
    return m.membership.status === "ACTIVE" && end > now && end <= threeDaysLater;
  });

  const expiredMembers = members.filter((m) => {
    if (!m.membership?.endDate) return false;
    const end = new Date(m.membership.endDate);
    return m.membership.status === "EXPIRED" || end <= now;
  });

  const totalAlerts = expiringMembers.length + expiredMembers.length;

  const visibleMembers = members.filter((member) => {
    const matchesSearch = `${member.name} ${member.phone}`.toLowerCase().includes(query.toLowerCase());
    if (!matchesSearch) return false;
    if (tab === "active") {
      return member.membership && member.membership.status === "ACTIVE" && new Date(member.membership.endDate) > now;
    }
    if (tab === "expired") {
      return member.membership && (member.membership.status === "EXPIRED" || new Date(member.membership.endDate) <= now);
    }
    return true;
  });

  return (
    <div>
      <div className="page-intro row-intro">
        <div>
          <span className="kicker">MEMBERS / {members.length} WARRIORS</span>
          <h2>People in motion.</h2>
          <p>Real-time members and subscription data from MongoDB.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          Add member <ArrowUpRight size={15} />
        </Button>
      </div>

      {!dismissedAlerts && totalAlerts > 0 && (
        <div className="flash-alerts-container">
          <div className="flash-alerts-header">
            <span>MEMBERSHIP EXPIRY ALERTS ({totalAlerts})</span>
            <button
              type="button"
              onClick={() => setDismissedAlerts(true)}
              title="Dismiss alerts"
            >
              ×
            </button>
          </div>

          {expiredMembers.map((m) => {
            const expDate = new Date(m.membership.endDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <div key={`expired-${m.id}`} className="flash-alert flash-alert-danger">
                <div className="flash-alert-left">
                  <span className="flash-badge danger">EXPIRED</span>
                  <span className="flash-message">
                    <strong>{m.name}</strong>'s {m.membership?.plan?.name || "Membership"} expired on <strong>{expDate}</strong>.
                  </span>
                </div>
                <div className="flash-alert-actions">
                  <button
                    type="button"
                    className="flash-action-btn"
                    onClick={() => onView?.(m)}
                  >
                    View Member
                  </button>
                  <button
                    type="button"
                    className="flash-action-btn reminder"
                    onClick={() => onSendReminder?.(m.id)}
                  >
                    Send WhatsApp
                  </button>
                </div>
              </div>
            );
          })}

          {expiringMembers.map((m) => {
            const expDate = new Date(m.membership.endDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const daysLeft = Math.max(1, Math.ceil((new Date(m.membership.endDate) - now) / (1000 * 60 * 60 * 24)));
            return (
              <div key={`expiring-${m.id}`} className="flash-alert flash-alert-warning">
                <div className="flash-alert-left">
                  <span className="flash-badge warning">EXPIRING IN {daysLeft}D</span>
                  <span className="flash-message">
                    <strong>{m.name}</strong>'s {m.membership?.plan?.name || "Membership"} expires on <strong>{expDate}</strong>.
                  </span>
                </div>
                <div className="flash-alert-actions">
                  <button
                    type="button"
                    className="flash-action-btn"
                    onClick={() => onView?.(m)}
                  >
                    View Member
                  </button>
                  <button
                    type="button"
                    className="flash-action-btn reminder"
                    onClick={() => onSendReminder?.(m.id)}
                  >
                    Send WhatsApp
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="table-panel">
        <div className="table-toolbar">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or phone..."
          />
          <div className="filter-pills">
            <button className={tab === "all" ? "selected" : ""} onClick={() => setTab("all")}>
              All members ({members.length})
            </button>
            <button className={tab === "active" ? "selected" : ""} onClick={() => setTab("active")}>
              Active ({members.filter((m) => m.membership?.status === "ACTIVE" && new Date(m.membership.endDate) > now).length})
            </button>
            <button className={tab === "expired" ? "selected" : ""} onClick={() => setTab("expired")}>
              Expired ({members.filter((m) => m.membership && (m.membership.status === "EXPIRED" || new Date(m.membership.endDate) <= now)).length})
            </button>
          </div>
        </div>

        <div className="member-table">
          <div className="table-head" style={{ gridTemplateColumns: "1.4fr 0.8fr 1fr 1.2fr 0.8fr 0.9fr 1.4fr" }}>
            <span>MEMBER</span>
            <span>EXPERIENCE</span>
            <span>PLAN</span>
            <span>PLAN DATES</span>
            <span>STATUS</span>
            <span>PAYMENT</span>
            <span>ACTION</span>
          </div>

          {visibleMembers.map((m) => (
            <div className="table-row" key={m.id} style={{ gridTemplateColumns: "1.4fr 0.8fr 1fr 1.2fr 0.8fr 0.9fr 1.4fr" }}>
              <div className="table-person">
                {m.profilePicture ? (
                  <img
                    src={m.profilePicture}
                    alt={m.name}
                    className="member-table-photo"
                    onClick={() => setPreviewPhoto({ url: m.profilePicture, name: m.name })}
                    title={`Click to preview photo of ${m.name}`}
                  />
                ) : (
                  <div className="avatar">{m.name.slice(0, 2).toUpperCase()}</div>
                )}
                <div>
                  <b>{m.name}</b>
                  <small>{m.phone}</small>
                </div>
              </div>
              <span>{m.experience || "BEGINNER"}</span>
              <span>{m.membership?.plan?.name || "No active plan"}</span>
              <span>
                {m.membership?.startDate
                  ? `${new Date(m.membership.startDate).toLocaleDateString("en-IN")} – ${new Date(m.membership.endDate).toLocaleDateString("en-IN")}`
                  : "–"}
              </span>
              <Status status={m.membership?.status || "NONE"} />
              <span>
                {m.latestPayment
                  ? `${m.latestPayment.status} (${m.latestPayment.paymentMethod || "ONLINE"})`
                  : "–"}
              </span>
              <div className="member-actions-col">
                <button
                  type="button"
                  className="member-action-btn view-btn"
                  onClick={() => onView?.(m)}
                  title="View member details"
                >
                  VIEW
                </button>
                <button
                  type="button"
                  className="member-action-btn reminder-btn"
                  onClick={() => onSendReminder?.(m.id)}
                  title="Send WhatsApp reminder"
                >
                  REMINDER
                </button>
                <button
                  type="button"
                  className="member-action-btn remove-btn"
                  onClick={() => setMemberToDelete(m)}
                  title="Permanently remove member"
                >
                  <X size={11} /> REMOVE
                </button>
                <button
                  type="button"
                  className="member-action-btn whatsapp-btn"
                  onClick={() => {
                    if (onSendWelcome) {
                      onSendWelcome(m);
                    } else {
                      const creationPwd = getMemberCreationPassword(m.phone) || getMemberCreationPassword(m.id);
                      const waUrl = buildWelcomeWhatsAppUrl(m, plans, creationPwd);
                      openWhatsAppUrl(waUrl);
                    }
                  }}
                  title="Send Welcome WhatsApp message"
                >
                  WELCOME WHATSAPP
                </button>
              </div>
            </div>
          ))}

          {visibleMembers.length === 0 && (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "#8b857a" }}>
              No members found in this view.
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddMemberModal
          plans={plans}
          onClose={() => setShowAddModal(false)}
          onCreate={onCreate}
        />
      )}

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          plans={plans}
          onClose={onCloseDetail}
          onRecordCashPayment={onRecordCashPayment}
          onSaveWorkoutPlan={onSaveWorkoutPlan}
          onSendReminder={onSendReminder}
        />
      )}
      {previewPhoto && (
        <div className="modal-backdrop" onClick={() => setPreviewPhoto(null)}>
          <div
            className="photo-lightbox"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setPreviewPhoto(null)}
              title="Close preview"
            >
              <X size={18} />
            </button>

            <div className="photo-lightbox-content">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.name}
                className="photo-lightbox-img"
              />
              <div className="photo-lightbox-caption">
                <b>{previewPhoto.name}</b>
                <span>Profile Photo</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {memberToDelete && (
        <div className="modal-backdrop" onClick={() => !deleteBusy && setMemberToDelete(null)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <button
              type="button"
              className="modal-close"
              disabled={deleteBusy}
              onClick={() => setMemberToDelete(null)}
              title="Close modal"
            >
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#db321f", marginBottom: 8 }}>
              <AlertTriangle size={24} />
              <span style={{ font: "700 11px/1 'DM Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Permanent Deletion
              </span>
            </div>

            <h3 style={{ margin: "0 0 10px", fontSize: 24 }}>Delete Member?</h3>

            <div className="delete-warning-box">
              <AlertTriangle size={20} style={{ color: "#db321f", flexShrink: 0, marginTop: 2 }} />
              <div>
                <b>Permanent Action</b>
                <p>
                  This action cannot be undone. All subscriptions, payments, workout plans, and notifications for <strong>{memberToDelete.name}</strong> will be permanently purged from MongoDB.
                </p>
              </div>
            </div>

            <div className="delete-member-summary">
              <div>
                <small>Member</small>
                <b>{memberToDelete.name}</b>
              </div>
              <div>
                <small>Phone</small>
                <b>{memberToDelete.phone}</b>
              </div>
              <div>
                <small>Plan</small>
                <b>{memberToDelete.membership?.plan?.name || "None"}</b>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button
                type="button"
                className="button-outline"
                style={{ flex: 1, padding: "12px 16px", cursor: "pointer" }}
                disabled={deleteBusy}
                onClick={() => setMemberToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-confirm-btn"
                style={{ flex: 1.4 }}
                disabled={deleteBusy}
                onClick={async () => {
                  setDeleteBusy(true);
                  try {
                    await onRemove(memberToDelete);
                    setMemberToDelete(null);
                  } catch (err) {
                    window.alert(err.message || "Failed to delete member");
                  } finally {
                    setDeleteBusy(false);
                  }
                }}
              >
                {deleteBusy ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OwnerPlans({ plans, onRefresh, setNotice }) {
  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    duration: 1,
    durationUnit: "MONTHS",
    price: "",
    features: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [busy, setBusy] = useState(false);

  const savePlan = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: newPlan.name,
        description: newPlan.description,
        duration: Number(newPlan.duration),
        durationUnit: newPlan.durationUnit,
        price: Number(newPlan.price),
        features: newPlan.features.split(",").map((feature) => feature.trim()).filter(Boolean),
      };

      if (editingPlan) {
        await api(`/plans/${editingPlan.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("Plan updated successfully in MongoDB.");
      } else {
        await api("/plans", { method: "POST", body: JSON.stringify(payload) });
        setNotice("New plan created and saved in MongoDB.");
      }

      setNewPlan({ name: "", description: "", duration: 1, durationUnit: "MONTHS", price: "", features: "" });
      setEditingPlan(null);
      setShowForm(false);
      await onRefresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (plan) => {
    setEditingPlan(plan);
    setNewPlan({
      name: plan.name,
      description: plan.description || "",
      duration: plan.duration,
      durationUnit: plan.durationUnit || "MONTHS",
      price: plan.price,
      features: (plan.features || []).join(", "),
    });
    setShowForm(true);
  };

  const togglePlan = async (plan) => {
    try {
      await api(`/plans/${plan.id}`, { method: "PUT", body: JSON.stringify({ active: !plan.active }) });
      setNotice(`Plan ${plan.name} status updated.`);
      await onRefresh();
    } catch (error) {
      window.alert(error.message);
    }
  };

  const deletePlan = async (plan) => {
    if (!window.confirm(`Deactivate plan ${plan.name}? Historical subscriptions will remain safe.`)) return;
    try {
      await api(`/plans/${plan.id}`, { method: "DELETE" });
      setNotice(`Plan ${plan.name} deactivated.`);
      await onRefresh();
    } catch (error) {
      window.alert(error.message);
    }
  };

  return (
    <div>
      <div className="page-intro row-intro">
        <div>
          <span className="kicker">CATALOG / {plans.length} PLANS IN MONGODB</span>
          <h2>Membership architecture.</h2>
          <p>Active plans appear to members automatically.</p>
        </div>
        <Button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              setEditingPlan(null);
            } else {
              setEditingPlan(null);
              setNewPlan({ name: "", description: "", duration: 1, durationUnit: "MONTHS", price: "", features: "" });
              setShowForm(true);
            }
          }}
        >
          {showForm ? "Close" : "New plan"} <ArrowUpRight size={15} />
        </Button>
      </div>

      {showForm && (
        <form className="settings-panel" onSubmit={savePlan} style={{ marginBottom: 25 }}>
          <span className="kicker" style={{ gridColumn: "1/-1" }}>
            {editingPlan ? `EDIT PLAN: ${editingPlan.name}` : "CREATE NEW PLAN"}
          </span>
          <label>
            Plan name *
            <input value={newPlan.name} onChange={(event) => setNewPlan({ ...newPlan, name: event.target.value })} required />
          </label>
          <label>
            Description
            <input value={newPlan.description} onChange={(event) => setNewPlan({ ...newPlan, description: event.target.value })} placeholder="Brief summary of plan" />
          </label>
          <label>
            Duration
            <input type="number" min="1" value={newPlan.duration} onChange={(event) => setNewPlan({ ...newPlan, duration: event.target.value })} required />
          </label>
          <label>
            Duration Unit
            <select
              value={newPlan.durationUnit}
              onChange={(event) => setNewPlan({ ...newPlan, durationUnit: event.target.value })}
              style={{ background: "transparent", border: 0, borderBottom: "1px solid #c9c3b9", padding: "14px 0", color: "#24221f", width: "100%" }}
            >
              <option value="MONTHS">MONTHS</option>
              <option value="DAYS">DAYS</option>
              <option value="YEARS">YEARS</option>
            </select>
          </label>
          <label>
            Price in INR *
            <input type="number" min="1" value={newPlan.price} onChange={(event) => setNewPlan({ ...newPlan, price: event.target.value })} required />
          </label>
          <label>
            Features (Comma separated)
            <input value={newPlan.features} onChange={(event) => setNewPlan({ ...newPlan, features: event.target.value })} placeholder="Gym access, Personal trainer, Steam" />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving..." : editingPlan ? "Update plan" : "Create plan"} <BadgeCheck size={16} />
          </Button>
        </form>
      )}

      <div className="owner-plan-list">
        {plans.map((p) => (
          <div className="owner-plan" key={p.id} style={{ gridTemplateColumns: "60px 1.5fr 120px 90px auto auto" }}>
            <div className="plan-number">0{p.duration}</div>
            <div>
              <b>{p.name}</b>
              {p.description && <small style={{ display: "block", color: "#6e685f" }}>{p.description}</small>}
              <p>{(p.features || []).join(" · ")}</p>
            </div>
            <strong>{money.format(p.price)}</strong>
            <Status status={p.active ? "ACTIVE" : "INACTIVE"} />
            <button className="text-action" onClick={() => startEdit(p)} title="Edit plan details">
              Edit
            </button>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="icon-button"
                onClick={() => togglePlan(p)}
                title={p.active ? "Deactivate plan" : "Activate plan"}
              >
                <ArrowUpRight size={17} />
              </button>
              <button
                className="remove-member"
                onClick={() => deletePlan(p)}
                title="Deactivate / Delete plan safely"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsPage({ notifications, onViewMember, onSendReminder, onMarkRead }) {
  return (
    <div>
      <Intro
        kicker="EXPIRY & ACTIVITY CENTER"
        title="Keep the loop closed."
        text="Automatic member expiry alerts (7d, 3d, 1d, expired) stored in MongoDB."
      />

      <div className="table-panel">
        <div className="member-table">
          <div className="table-head" style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 1.5fr" }}>
            <span>TYPE</span>
            <span>ALERT & MEMBER</span>
            <span>PLAN</span>
            <span>DATE</span>
            <span>ACTION</span>
          </div>

          {notifications.map((n) => (
            <div
              className="table-row"
              key={n.id}
              style={{ gridTemplateColumns: "1fr 2fr 1fr 1fr 1.5fr", opacity: n.read ? 0.75 : 1, cursor: n.member ? "pointer" : "default" }}
              onClick={() => n.member && onViewMember(n.member)}
            >
              <div>
                <span className="status status-active" style={{ fontSize: 9 }}>
                  {n.type.replace("EXPIRY_", "").replace("_", " ")}
                </span>
              </div>
              <div>
                <b>{n.member?.name || "Member"}</b>
                <p style={{ color: "#7a746a", fontSize: 12, marginTop: 2 }}>{n.message}</p>
                {n.reminderStatus && (
                  <small style={{ color: "#568365", display: "block", marginTop: 2 }}>
                    Reminder: {n.reminderStatus}
                  </small>
                )}
              </div>
              <span>{n.plan?.name || "Plan"}</span>
              <small>{new Date(n.createdAt).toLocaleDateString("en-IN")}</small>
              <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                {n.member && (
                  <button className="text-action" onClick={() => onViewMember(n.member)}>
                    View
                  </button>
                )}
                <button
                  className="text-action"
                  style={{ color: "#db321f" }}
                  onClick={() => onSendReminder(n.id)}
                >
                  Send WhatsApp
                </button>
                {!n.read && (
                  <button className="text-action" onClick={() => onMarkRead(n.id)}>
                    Dismiss
                  </button>
                )}
              </div>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="empty-panel">
              <Bell size={28} />
              <h3>All caught up.</h3>
              <p>No membership expiry notifications currently require attention.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentsPage({ payments }) {
  return (
    <div>
      <Intro
        kicker="PAYMENTS / REVENUE"
        title="Every rupee has a story."
        text="All verified cash and Razorpay payments from MongoDB."
      />
      <div className="table-panel">
        <div className="member-table">
          <div className="table-head" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1.2fr" }}>
            <span>MEMBER</span>
            <span>PLAN</span>
            <span>METHOD</span>
            <span>AMOUNT</span>
            <span>STATUS & DATE</span>
          </div>
          {payments.map((p) => (
            <div className="table-row" key={p.id} style={{ gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1.2fr" }}>
              <div className="table-person">
                <div className="avatar">
                  {p.member?.name?.slice(0, 2).toUpperCase() || "MB"}
                </div>
                <div>
                  <b>{p.member?.name || "Member"}</b>
                  <small>{p.member?.phone || ""}</small>
                </div>
              </div>
              <span>{p.plan?.name || "Plan"}</span>
              <span>
                <b style={{ color: p.paymentMethod === "CASH" ? "#246338" : "#24231f" }}>
                  {p.paymentMethod || (p.razorpayPaymentId ? "RAZORPAY" : "ONLINE")}
                </b>
                {p.razorpayPaymentId && (
                  <small style={{ color: "#8e887d", display: "block", fontSize: 10, wordBreak: "break-all" }}>
                    {p.razorpayPaymentId}
                  </small>
                )}
              </span>
              <b>{money.format(p.amount)}</b>
              <div>
                <Status status={p.status} />
                <small style={{ color: "#8e887d", display: "block", marginTop: 3 }}>
                  {new Date(p.createdAt).toLocaleDateString("en-IN")}
                </small>
              </div>
            </div>
          ))}

          {payments.length === 0 && (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "#8b857a" }}>
              No payments recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default function App() {
  const [view, setView] = useState("landing");
  const [user, setUser] = useState(null);
  const [initialPage, setInitialPage] = useState("dashboard");
  const [initialPlanId, setInitialPlanId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const renewToken = urlParams.get("renew");

    if (renewToken) {
      api(`/auth/renew-session?token=${encodeURIComponent(renewToken)}`)
        .then((res) => {
          if (res?.user && res?.token) {
            localStorage.setItem("warrior_token", res.token);
            setUser(res.user);
            setView("member");
            setInitialPage("membership");
            if (res.planId) setInitialPlanId(res.planId);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })
        .catch((err) => {
          console.warn("Renewal link session error:", err.message);
          const savedToken = localStorage.getItem("warrior_token");
          if (savedToken) {
            api("/auth/me")
              .then((res) => {
                if (res?.user) {
                  setUser(res.user);
                  setView(res.user.role === "owner" ? "owner" : "member");
                }
              })
              .catch(() => {
                localStorage.removeItem("warrior_token");
              });
          }
        });
      return;
    }

    const savedToken = localStorage.getItem("warrior_token");
    if (savedToken) {
      api("/auth/me")
        .then((res) => {
          if (res?.user) {
            setUser(res.user);
            setView(res.user.role === "owner" ? "owner" : "member");
          }
        })
        .catch(() => {
          localStorage.removeItem("warrior_token");
        });
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("warrior_token");
    setUser(null);
    setView("landing");
    setInitialPage("dashboard");
    setInitialPlanId(null);
  };
  const success = (u) => {
    setUser(u);
    setView(u.role === "owner" ? "owner" : "member");
  };
  if (view === "member" && user)
    return (
      <MemberApp
        user={user}
        onLogout={logout}
        initialPage={initialPage}
        initialPlanId={initialPlanId}
      />
    );
  if (view === "owner" && user)
    return <OwnerApp user={user} onLogout={logout} />;
  if (view === "login")
    return (
      <Auth
        mode="member"
        onSuccess={success}
        onBack={() => setView("landing")}
      />
    );
  if (view === "owner-login")
    return (
      <Auth
        mode="owner"
        onSuccess={success}
        onBack={() => setView("landing")}
      />
    );
  if (view === "register")
    return (
      <Auth
        mode="register"
        onSuccess={success}
        onBack={() => setView("landing")}
      />
    );
  return (
    <Landing
      onLogin={(m) => setView(m === "owner" ? "owner-login" : "login")}
      onRegister={() => setView("register")}
    />
  );
}
