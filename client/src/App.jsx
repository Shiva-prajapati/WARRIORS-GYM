import React, { Component, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  ShieldCheck,
  Star,
  Trophy,
  UserRound,
  Users,
  Utensils,
  X,
  Zap,
} from "lucide-react";
import "./App.css";

function InstagramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function YoutubeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="15" x="2" y="4.5" rx="4" ry="4"/>
      <polygon points="10 9 15 12 10 15 10 9" fill="currentColor"/>
    </svg>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught display error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", backgroundColor: "#070708", color: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ maxWidth: 440, width: "100%", background: "#121214", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 32, textAlign: "center" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#fff" }}>Unable to load view</h2>
            <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              An unexpected display error occurred. You can reload the page or return to the main portal.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ background: "#db321f", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
              >
                Reload
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("warrior_token");
                  window.location.href = "/";
                }}
                style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 18px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [transformationIndex, setTransformationIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api("/plans")
      .then((res) => {
        if (active && res?.plans) {
          setPlans(res.plans);
        }
      })
      .catch((err) => {
        console.warn("Could not load public plans for landing:", err.message);
      })
      .finally(() => {
        if (active) setLoadingPlans(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const transformations = [
    {
      badge: "+12 KG MUSCLE GAIN",
      title: "Hypertrophy & Mass Progression",
      subtitle: "Dedicated progressive overload & customized caloric balance.",
      duration: "16 Weeks Training",
      category: "STRENGTH & HYPERTROPHY",
    },
    {
      badge: "-15 KG FAT LOSS",
      title: "Metabolic Lean Definition",
      subtitle: "High-density conditioning, functional intervals & sustained deficit.",
      duration: "20 Weeks Training",
      category: "FAT LOSS & CONDITIONING",
    },
    {
      badge: "STRENGTH & CONFIDENCE",
      title: "Complete Athletic Recomposition",
      subtitle: "Compound barbell mastery, postural alignment & daily discipline.",
      duration: "24 Weeks Training",
      category: "ATHLETIC RECOMPOSITION",
    },
  ];

  const facilities = [
    {
      title: "Strength Training",
      kicker: "HEAVY DUTY ZONE",
      desc: "Olympic power cages, competition barbells, calibrated cast iron plates.",
      image: "/images/facility-strength.jpg",
    },
    {
      title: "Cardio Zone",
      kicker: "ENDURANCE ARENA",
      desc: "Commercial treadmills, stairmasters and high-performance monitors.",
      image: "/images/facility-cardio.jpg",
    },
    {
      title: "Free Weights",
      kicker: "PRECISION RIG",
      desc: "Tiered dumbbells up to 50kg, precision kettlebells and adjustable benches.",
      image: "/images/facility-freeweights.jpg",
    },
    {
      title: "Functional Training",
      kicker: "AGILITY & POWER",
      desc: "Indoor green sprint turf track, heavy prowler sleds and battle ropes.",
      image: "/images/facility-functional.jpg",
    },
  ];

  const testimonials = [
    {
      name: "Rohit Kumar",
      duration: "3 months member",
      avatar: "RK",
      quote:
        "Best gym in the city. Amazing trainers, heavy-duty equipment, and an intensely supportive environment. I feel much stronger and more confident now.",
    },
    {
      name: "Anjali Sharma",
      duration: "6 months member",
      avatar: "AS",
      quote:
        "The personalized workout routine and diet guidance actually work. Lost 12 kg while gaining real strength, energy, and mental discipline!",
    },
    {
      name: "Priyansh Mehta",
      duration: "1 year member",
      avatar: "PM",
      quote:
        "Great community and exceptionally well-equipped gym. Coaches are dedicated, the atmosphere is electric, and the digital portal makes tracking effortless.",
    },
  ];

  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const nextTransformation = () => {
    setTransformationIndex((prev) => (prev + 1) % transformations.length);
  };
  const prevTransformation = () => {
    setTransformationIndex((prev) => (prev - 1 + transformations.length) % transformations.length);
  };

  const sortedPlans = [...plans].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));

  const isPopular = (plan, idx, total) => {
    const nameLower = (plan.name || "").toLowerCase();
    if (nameLower.includes("advance") || nameLower.includes("popular")) return true;
    if (total >= 3 && idx === 1) return true;
    if (total === 2 && idx === 1) return true;
    return false;
  };

  return (
    <main className="landing cinematic-landing">
      {/* 1. STICKY CINEMATIC NAVIGATION */}
      <header className="cinematic-nav">
        <Brand />
        <nav className="cinematic-nav-links">
          <button type="button" onClick={() => scrollTo("home")}>Home</button>
          <button type="button" onClick={() => scrollTo("method")}>Method</button>
          <button type="button" onClick={() => scrollTo("membership")}>Membership</button>
          <button type="button" onClick={() => scrollTo("facilities")}>Facilities</button>
          <button type="button" onClick={() => scrollTo("transformation")}>Transformation</button>
          <button type="button" onClick={() => scrollTo("contact")}>Contact</button>
        </nav>
        <div className="cinematic-nav-actions">
          <button
            type="button"
            className="owner-link-btn"
            onClick={() => onLogin("owner")}
            title="Owner Portal Access"
          >
            Owner Portal
          </button>
          <button
            type="button"
            className="member-login-pill-btn"
            onClick={() => onLogin("member")}
          >
            Member Login <ArrowUpRight size={15} />
          </button>
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* MOBILE NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-nav-links">
            <button type="button" onClick={() => scrollTo("home")}>Home</button>
            <button type="button" onClick={() => scrollTo("method")}>Method</button>
            <button type="button" onClick={() => scrollTo("membership")}>Membership</button>
            <button type="button" onClick={() => scrollTo("facilities")}>Facilities</button>
            <button type="button" onClick={() => scrollTo("transformation")}>Transformation</button>
            <button type="button" onClick={() => scrollTo("contact")}>Contact</button>
          </div>
          <div className="mobile-nav-footer">
            <button
              type="button"
              className="member-login-pill-btn full-w"
              onClick={() => { setMobileMenuOpen(false); onLogin("member"); }}
            >
              Member Login <ArrowUpRight size={15} />
            </button>
            <button
              type="button"
              className="owner-link-btn full-w"
              onClick={() => { setMobileMenuOpen(false); onLogin("owner"); }}
            >
              Owner Portal
            </button>
          </div>
        </div>
      )}

      {/* 2. CINEMATIC HERO SECTION */}
      <section className="cinematic-hero" id="home">
        <div className="hero-bg-layer">
          <img
            src="/images/hero-athlete.jpg"
            alt="Warriors Gym Champion Athlete"
            className="hero-bg-img"
            fetchpriority="high"
          />
          <div className="hero-vignette-overlay" />
          <div className="hero-red-ambient-glow" />
          <div className="hero-ambient-wall-text" aria-hidden="true">
            DISCIPLINE BUILDS FREEDOM
          </div>
        </div>

        <div className="hero-inner-container">
          <div className="hero-content-col">
            <div className="hero-top-badge">
              <span className="badge-dot" /> EST. 2018 · WARRIORS PERFORMANCE CLUB
            </div>
            <h1 className="hero-giant-heading">
              BUILD<br />
              YOUR<br />
              <span className="text-crimson">STRENGTH.</span>
            </h1>
            <p className="hero-lead-text">
              A focused training environment for people who are serious about becoming harder to stop.
            </p>
            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-primary-crimson"
                onClick={() => onRegister()}
              >
                Join Warriors <ArrowUpRight size={16} />
              </button>
              <button
                type="button"
                className="btn-secondary-glass"
                onClick={() => scrollTo("membership")}
              >
                View Plans
              </button>
            </div>
            <div className="hero-social-proof-pill">
              <div className="avatar-stack">
                <span className="av-circle av-1">AS</span>
                <span className="av-circle av-2">RK</span>
                <span className="av-circle av-3">PM</span>
              </div>
              <div className="proof-ratings-text">
                <div className="proof-score">
                  <Star size={13} fill="#f59e0b" color="#f59e0b" /> 4.9 / 5
                </div>
                <div className="proof-caption">from 240+ warriors</div>
              </div>
            </div>
          </div>

          <div className="hero-right-badge-wrap">
            <div className="hero-floating-glass-badge">
              <small className="badge-num">04 / 08</small>
              <b className="badge-tag">DISCIPLINE OVER MOTIVATION</b>
              <ArrowUpRight size={14} className="badge-arrow" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. 4 PILLARS FEATURE STRIP */}
      <section className="pillars-strip">
        <div className="pillars-grid">
          <div className="pillar-card">
            <div className="pillar-icon-box">
              <Dumbbell size={20} />
            </div>
            <div className="pillar-text">
              <h3>TRAIN WITH INTENT</h3>
              <p>Structured workout plans for real results</p>
            </div>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <Utensils size={20} />
            </div>
            <div className="pillar-text">
              <h3>EAT WITH PURPOSE</h3>
              <p>Personalized diet guidance for your goals</p>
            </div>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <HeartPulse size={20} />
            </div>
            <div className="pillar-text">
              <h3>LIVE WITH POWER</h3>
              <p>Build strength, confidence and better habits</p>
            </div>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <Users size={20} />
            </div>
            <div className="pillar-text">
              <h3>SUPPORTIVE COMMUNITY</h3>
              <p>Surround yourself with like-minded people</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE WARRIORS METHOD */}
      <section className="method-section" id="method">
        <div className="method-container">
          <div className="method-left-copy">
            <span className="kicker-tag">THE WARRIORS METHOD</span>
            <h2 className="section-huge-heading">
              YOUR NEXT LEVEL<br />
              IS <span className="text-crimson">BUILT DAILY.</span>
            </h2>
            <p className="method-desc">
              We combine intelligent programming, honest coaching, and a community that expects more from you. No noise. No shortcuts. Just the work that changes everything.
            </p>
            <button
              type="button"
              className="btn-primary-crimson method-btn"
              onClick={() => scrollTo("membership")}
            >
              Our Method <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="method-center-media">
            <div className="media-frame" onClick={() => setStoryModalOpen(true)}>
              <img
                src="/images/method-curls.jpg"
                alt="Warriors Gym Training Showcase"
                className="method-media-img"
                loading="lazy"
              />
              <div className="media-overlay-glow" />
              <button
                type="button"
                className="play-story-btn"
                onClick={(e) => { e.stopPropagation(); setStoryModalOpen(true); }}
                aria-label="Watch Our Story"
              >
                <span className="play-icon-circle"><Play size={20} fill="#fff" /></span>
                <span className="play-label">WATCH OUR STORY</span>
              </button>
            </div>
          </div>

          <div className="method-right-stats">
            <div className="stat-box">
              <b className="stat-number">06</b>
              <small className="stat-label">Years sharpening the craft</small>
            </div>
            <div className="stat-divider" />
            <div className="stat-box">
              <b className="stat-number">240+</b>
              <small className="stat-label">Active warriors in the club</small>
            </div>
            <div className="stat-divider" />
            <div className="stat-box">
              <b className="stat-number">24/7</b>
              <small className="stat-label">Digital training companion</small>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MEMBERSHIP PLANS (FROM MONGODB) */}
      <section className="membership-section" id="membership">
        <div className="membership-header-row">
          <div>
            <span className="kicker-tag">MEMBERSHIP, WITHOUT THE FRICTION</span>
            <h2 className="section-huge-heading">
              CHOOSE YOUR<br />
              <span className="text-crimson">COMMITMENT.</span>
            </h2>
          </div>
          <button
            type="button"
            className="view-all-plans-link"
            onClick={() => onRegister()}
          >
            View All Plans <ArrowUpRight size={15} />
          </button>
        </div>

        <div className="membership-interactive-layout">
          <div className="membership-ambient-side">
            <div className="plates-art-wrap">
              <div className="ambient-plate plate-3">45</div>
              <div className="ambient-plate plate-2">25</div>
              <div className="ambient-plate plate-1">W</div>
              <div className="ambient-ember-glow" />
            </div>
            <div className="membership-side-quote">
              <Flame size={18} className="text-crimson" />
              <p>Transparent pricing from MongoDB. Zero hidden front-desk fees. Secure Razorpay checkout.</p>
            </div>
          </div>

          <div className="membership-cards-grid">
            {loadingPlans ? (
              <div className="plan-skeleton-row">
                <div className="plan-skeleton-card" />
                <div className="plan-skeleton-card popular" />
                <div className="plan-skeleton-card" />
              </div>
            ) : sortedPlans.length === 0 ? (
              <div className="empty-plans-box">
                <Trophy size={32} />
                <h3>Active Plans Updating</h3>
                <p>Please check back shortly or contact Warriors Gym front desk.</p>
              </div>
            ) : (
              sortedPlans.map((plan, idx) => {
                const popular = isPopular(plan, idx, sortedPlans.length);
                const durationLabel = `${plan.duration} ${String(plan.durationUnit || "MONTHS").toLowerCase()}`;
                const durationSubtitle = `For ${plan.duration} ${String(plan.durationUnit || "MONTHS").toLowerCase()} of focused training.`;
                const featuresList = Array.isArray(plan.features) && plan.features.length > 0
                  ? plan.features
                  : ["Full access to gym floor", "Personalized workout routine", "Diet guidance & accountability", "Digital member portal"];

                return (
                  <div
                    key={plan.id}
                    className={`cinematic-plan-card ${popular ? "is-popular-card" : ""}`}
                  >
                    {popular && (
                      <div className="popular-badge-pill">
                        MOST POPULAR
                      </div>
                    )}
                    <div className="plan-card-header">
                      <div className="plan-title-row">
                        <h3 className="plan-card-name">
                          WARRIOR {plan.name.toUpperCase()}
                        </h3>
                      </div>
                      <div className="plan-price-block">
                        <span className="plan-price-val">{money.format(plan.price)}</span>
                        <span className="plan-price-period">/ {durationLabel}</span>
                      </div>
                      <p className="plan-card-subtitle">{durationSubtitle}</p>
                    </div>

                    <div className="plan-features-list">
                      {featuresList.map((feat, fIdx) => (
                        <div key={fIdx} className="feature-item">
                          <Check size={14} className="feature-check-icon" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>

                    <div className="plan-card-footer">
                      <button
                        type="button"
                        className={`plan-cta-btn ${popular ? "btn-popular-crimson" : "btn-standard-glass"}`}
                        onClick={() => onRegister(plan.id)}
                      >
                        {popular ? "Choose Plan" : "Get Started"} <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* 6. PREMIUM FACILITIES */}
      <section className="facilities-section" id="facilities">
        <div className="section-title-wrap">
          <span className="kicker-tag">PREMIUM FACILITIES</span>
          <h2 className="section-huge-heading">
            EVERYTHING YOU NEED UNDER <span className="text-crimson">ONE ROOF.</span>
          </h2>
        </div>

        <div className="facilities-grid">
          {facilities.map((fac, idx) => (
            <div key={idx} className="facility-card">
              <div className="facility-img-wrap">
                <img
                  src={fac.image}
                  alt={fac.title}
                  className="facility-img"
                  loading="lazy"
                />
                <div className="facility-img-gradient" />
              </div>
              <div className="facility-content">
                <span className="facility-kicker">{fac.kicker}</span>
                <h3 className="facility-title">{fac.title}</h3>
                <p className="facility-desc">{fac.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. WARRIORS TRANSFORMATIONS */}
      <section className="transformations-section" id="transformation">
        <div className="transformations-header-row">
          <div>
            <span className="kicker-tag">REAL PEOPLE. REAL RESULTS.</span>
            <h2 className="section-huge-heading">
              WARRIORS <span className="text-crimson">TRANSFORMATIONS.</span>
            </h2>
          </div>
          <div className="carousel-nav-arrows">
            <button
              type="button"
              className="carousel-btn"
              onClick={prevTransformation}
              aria-label="Previous Transformation"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="carousel-btn"
              onClick={nextTransformation}
              aria-label="Next Transformation"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="transformations-showcase-row">
          {transformations.map((t, idx) => {
            const isCurrent = idx === transformationIndex;
            return (
              <div
                key={idx}
                className={`transformation-spotlight-card ${isCurrent ? "spotlight-active" : ""}`}
                onClick={() => setTransformationIndex(idx)}
              >
                <div className="spotlight-visual-box">
                  <div className="transformation-split-visual">
                    <div className="split-half before-half">
                      <span className="split-tag">BEFORE</span>
                    </div>
                    <div className="split-divider-line" />
                    <div className="split-half after-half">
                      <span className="split-tag red-tag">AFTER</span>
                    </div>
                  </div>
                  <div className="trans-result-pill">
                    {t.badge}
                  </div>
                </div>
                <div className="spotlight-meta">
                  <span className="spotlight-cat">{t.category}</span>
                  <h3 className="spotlight-title">{t.title}</h3>
                  <p className="spotlight-sub">{t.subtitle}</p>
                  <small className="spotlight-duration">Timeline: {t.duration}</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. MEMBER TESTIMONIALS */}
      <section className="testimonials-section">
        <div className="section-title-wrap">
          <span className="kicker-tag">WHAT OUR MEMBERS SAY</span>
          <h2 className="section-huge-heading">
            A STRONGER <span className="text-crimson">COMMUNITY EVERYDAY.</span>
          </h2>
        </div>

        <div className="testimonials-grid">
          {testimonials.map((testi, idx) => (
            <div key={idx} className="testimonial-luxury-card">
              <div className="testimonial-author-row">
                <div className="testimonial-avatar-wrap">
                  <span className="testi-av">{testi.avatar}</span>
                </div>
                <div className="testimonial-author-info">
                  <h4 className="testi-author-name">{testi.name}</h4>
                  <small className="testi-author-meta">{testi.duration}</small>
                  <div className="testi-stars">
                    {[...Array(5)].map((_, s) => (
                      <Star key={s} size={13} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="testimonial-quote-body">
                "{testi.quote}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 9. FINAL CALL-TO-ACTION BANNER */}
      <section className="cta-banner-section">
        <div className="cta-banner-inner">
          <img
            src="/images/cta-banner.jpg"
            alt="Warriors Gym Discipline"
            className="cta-banner-bg-img"
            loading="lazy"
          />
          <div className="cta-banner-overlay" />

          <div className="cta-banner-content-col">
            <h2 className="cta-banner-heading">
              READY TO BECOME<br />
              A <span className="text-crimson">WARRIOR?</span>
            </h2>
            <p className="cta-banner-subtitle">
              Join a community that pushes you, supports you and helps you build a stronger, healthier, better you.
            </p>
            <div className="cta-btn-wrap">
              <button
                type="button"
                className="btn-primary-crimson cta-join-btn"
                onClick={() => onRegister()}
              >
                Join Now <ArrowUpRight size={17} />
              </button>
            </div>

            <div className="cta-perks-row">
              <div className="cta-perk"><Check size={14} className="text-crimson" /> No Long Contracts</div>
              <div className="cta-perk"><HeartPulse size={14} className="text-crimson" /> Expert Guidance</div>
              <div className="cta-perk"><Users size={14} className="text-crimson" /> Supportive Community</div>
              <div className="cta-perk"><Trophy size={14} className="text-crimson" /> Real Results</div>
            </div>
          </div>

          <div className="cta-banner-quote-col" aria-hidden="true">
            <div className="stencil-phrase">
              <span>DISCIPLINE</span>
              <span>TODAY</span>
              <span className="accent-phrase">A STRONGER</span>
              <span className="accent-phrase">TOMORROW</span>
            </div>
          </div>
        </div>
      </section>

      {/* 10. PREMIUM FOOTER */}
      <footer className="cinematic-footer" id="contact">
        <div className="footer-top-row">
          <div className="footer-brand-col">
            <Brand />
            <p className="footer-tagline">
              BUILD YOUR STRENGTH. BUILD YOURSELF.
            </p>
          </div>

          <nav className="footer-nav-col">
            <button type="button" onClick={() => scrollTo("home")}>Home</button>
            <button type="button" onClick={() => scrollTo("method")}>Method</button>
            <button type="button" onClick={() => scrollTo("membership")}>Membership</button>
            <button type="button" onClick={() => scrollTo("facilities")}>Facilities</button>
            <button type="button" onClick={() => scrollTo("transformation")}>Transformation</button>
            <button type="button" onClick={() => scrollTo("contact")}>Contact</button>
          </nav>

          <div className="footer-social-col">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="footer-social-icon"
              aria-label="Instagram"
            >
              <InstagramIcon size={18} />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              className="footer-social-icon"
              aria-label="YouTube"
            >
              <YoutubeIcon size={18} />
            </a>
            <a
              href="https://wa.me/919761933379"
              target="_blank"
              rel="noreferrer"
              className="footer-social-icon"
              aria-label="WhatsApp"
            >
              <MessageCircle size={18} />
            </a>
          </div>
        </div>

        <div className="footer-info-row">
          <div className="footer-info-item">
            <MapPin size={15} className="text-crimson" />
            <span>Warriors Training Arena, Sector 4</span>
          </div>
          <div className="footer-info-item">
            <Clock size={15} className="text-crimson" />
            <span>Mon – Sun: 06:00 AM – 10:00 PM</span>
          </div>
          <div className="footer-info-item">
            <Phone size={15} className="text-crimson" />
            <span>+91 97619 33379</span>
          </div>
        </div>

        <div className="footer-bottom-row">
          <span>© 2026 WARRIORS GYM. All rights reserved.</span>
          <div className="footer-legal-links">
            <button type="button" onClick={() => onLogin("owner")} className="footer-owner-link">
              Owner Portal
            </button>
            <button type="button" onClick={() => onLogin("member")} className="footer-member-link">
              Member Login
            </button>
          </div>
        </div>
      </footer>

      {/* WATCH OUR STORY MODAL */}
      {storyModalOpen && (
        <div className="story-modal-backdrop" onClick={() => setStoryModalOpen(false)}>
          <div className="story-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="story-modal-header">
              <div className="story-modal-brand">
                <span className="brand-mark-mini">W</span>
                <b>WARRIORS GYM · THE CULTURE</b>
              </div>
              <button
                type="button"
                className="close-story-btn"
                onClick={() => setStoryModalOpen(false)}
                aria-label="Close Story"
              >
                <X size={18} />
              </button>
            </div>
            <div className="story-modal-body">
              <div className="story-video-placeholder">
                <img
                  src="/images/method-curls.jpg"
                  alt="Training Culture"
                  className="story-preview-img"
                />
                <div className="story-video-text">
                  <h3>THE STANDARD NEVER DROPS.</h3>
                  <p>
                    Every rep counts. We combine heavy-duty strength equipment, structured progressive coaching, and a driven community that pushes you past your limits.
                  </p>
                  <button
                    type="button"
                    className="btn-primary-crimson"
                    onClick={() => { setStoryModalOpen(false); scrollTo("membership"); }}
                  >
                    Explore Membership Plans <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Auth({ mode, onSuccess, onBack }) {
  const [register, setRegister] = useState(mode === "register");
  const [showPassword, setShowPassword] = useState(false);
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
  const update = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const cleaned = value.replace(/\D/g, "").slice(0, 10);
      setForm((prev) => ({ ...prev, phone: cleaned }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
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
  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const phoneDigits = (form.phone || "").trim().replace(/\D/g, "");
    if (!/^[0-9]{10}$/.test(phoneDigits)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setBusy(true);
    try {
      const data = await api(register ? "/auth/register" : "/auth/login", {
        method: "POST",
        body: JSON.stringify({ ...form, phone: phoneDigits }),
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
      <header className="auth-header">
        <div className="auth-header-brand" onClick={onBack} title="Back to home">
          <div className="auth-logo-badge">
            <svg viewBox="0 0 512 512" width="28" height="28" fill="none">
              <line x1="80" y1="80" x2="432" y2="432" stroke="#9da3af" strokeWidth="26" strokeLinecap="round"/>
              <rect x="70" y="55" width="20" height="70" rx="4" fill="#e51b24" transform="rotate(45 80 90)"/>
              <rect x="420" y="405" width="20" height="70" rx="4" fill="#e51b24" transform="rotate(45 430 440)"/>
              <line x1="432" y1="80" x2="80" y2="432" stroke="#9da3af" strokeWidth="26" strokeLinecap="round"/>
              <rect x="420" y="55" width="20" height="70" rx="4" fill="#e51b24" transform="rotate(-45 430 90)"/>
              <rect x="70" y="405" width="20" height="70" rx="4" fill="#e51b24" transform="rotate(-45 80 440)"/>
              <path d="M 256 100 C 340 100, 390 135, 390 190 C 390 320, 256 425, 256 425 C 256 425, 122 320, 122 190 C 122 135, 172 100, 256 100 Z" fill="#16181d" stroke="#cbd0db" strokeWidth="18" strokeLinejoin="round"/>
              <path d="M 256 122 C 324 122, 368 152, 368 198 C 368 305, 256 395, 256 395 C 256 395, 144 305, 144 198 C 144 152, 188 122, 256 122 Z" fill="#0d0e12" stroke="#e51b24" strokeWidth="8"/>
              <path d="M 180 185 L 214 185 L 238 290 L 256 220 L 274 290 L 298 185 L 332 185 L 292 340 L 262 340 L 256 312 L 250 340 L 220 340 Z" fill="#ffffff"/>
              <polygon points="256,160 266,220 256,245 246,220" fill="#e51b24"/>
            </svg>
          </div>
          <div className="auth-brand-text">
            <span className="auth-brand-title">WARRIORS FITNESS GYM</span>
            <span className="auth-brand-sub">CO LTD</span>
          </div>
        </div>
        <button type="button" className="auth-home-link" onClick={onBack}>
          HOME <ArrowRight size={14} />
        </button>
      </header>

      <div className="auth-body">
        <section className="auth-hero-pane">
          <div className="auth-hero-content">
            <div className="auth-hero-crest">
              <svg viewBox="0 0 512 512" width="76" height="76" fill="none">
                <line x1="80" y1="80" x2="432" y2="432" stroke="#a0a6b5" strokeWidth="24" strokeLinecap="round"/>
                <rect x="70" y="55" width="22" height="70" rx="4" fill="#e51b24" transform="rotate(45 80 90)"/>
                <rect x="420" y="405" width="22" height="70" rx="4" fill="#e51b24" transform="rotate(45 430 440)"/>
                <line x1="432" y1="80" x2="80" y2="432" stroke="#a0a6b5" strokeWidth="24" strokeLinecap="round"/>
                <rect x="420" y="55" width="22" height="70" rx="4" fill="#e51b24" transform="rotate(-45 430 90)"/>
                <rect x="70" y="405" width="22" height="70" rx="4" fill="#e51b24" transform="rotate(-45 80 440)"/>
                <path d="M 256 100 C 340 100, 390 135, 390 190 C 390 320, 256 425, 256 425 C 256 425, 122 320, 122 190 C 122 135, 172 100, 256 100 Z" fill="#16181d" stroke="#ffffff" strokeWidth="18" strokeLinejoin="round"/>
                <path d="M 256 122 C 324 122, 368 152, 368 198 C 368 305, 256 395, 256 395 C 256 395, 144 305, 144 198 C 144 152, 188 122, 256 122 Z" fill="#0d0e12" stroke="#e51b24" strokeWidth="8"/>
                <path d="M 180 185 L 214 185 L 238 290 L 256 220 L 274 290 L 298 185 L 332 185 L 292 340 L 262 340 L 256 312 L 250 340 L 220 340 Z" fill="#ffffff"/>
                <polygon points="256,160 266,220 256,245 246,220" fill="#e51b24"/>
              </svg>
            </div>
            <span className="auth-hero-kicker">MEMBER AND STAFF ACCESS</span>
            <h1 className="auth-hero-headline">
              MAKE EVERY<br />
              TRAINING<br />
              DAY BETTER.
            </h1>
            <p className="auth-hero-desc">
              One secure login connects staff, Fat Fighter members, Gym members, and online coaching members to the right Warriors area automatically.
            </p>
            <div className="auth-hero-pills">
              <span className="auth-pill">STAFF</span>
              <span className="auth-pill">FAT FIGHTER</span>
              <span className="auth-pill">GYM MEMBER</span>
              <span className="auth-pill">ABROAD MEMBER</span>
            </div>
          </div>
        </section>

        <section className="auth-card-pane">
          <div className="auth-card">
            <span className="auth-card-kicker">
              {register ? "SECURE REGISTRATION" : "SECURE LOGIN"}
            </span>
            <h2 className="auth-card-title">
              {register ? "SIGN UP" : "SIGN IN"}
            </h2>

            <form className="auth-card-form" onSubmit={submit}>
              {register && (
                <>
                  <div className="auth-field-group">
                    <label className="auth-field-label">FULL NAME</label>
                    <input
                      className="auth-input-light"
                      name="name"
                      value={form.name}
                      onChange={update}
                      placeholder="e.g. Rahul Sharma"
                      required
                    />
                  </div>
                  <div className="auth-field-group">
                    <label className="auth-field-label">VILLAGE / LOCALITY</label>
                    <input
                      className="auth-input-light"
                      name="village"
                      value={form.village}
                      onChange={update}
                      placeholder="Village or locality name"
                    />
                  </div>
                </>
              )}

              <div className="auth-field-group">
                <label className="auth-field-label">
                  {register ? "PHONE / USERNAME" : "USERNAME"}
                </label>
                <input
                  className="auth-input-light"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  value={form.phone}
                  onChange={update}
                  placeholder="10 digit mobile number"
                  required
                  autoFocus
                />
              </div>

              <div className="auth-field-group">
                <label className="auth-field-label">PASSWORD</label>
                <div className="auth-password-wrapper">
                  <input
                    className="auth-input-light"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={update}
                    placeholder="••••••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="auth-pw-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {register && (
                <div className="auth-field-group">
                  <label className="auth-field-label">PROFILE PICTURE (OPTIONAL)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={updatePicture}
                    className="auth-file-input"
                  />
                  {form.profilePicture && (
                    <img src={form.profilePicture} alt="Profile preview" className="auth-picture-preview" />
                  )}
                </div>
              )}

              {error && (
                <div className="auth-error-msg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="auth-red-btn"
                disabled={busy}
              >
                {busy
                  ? (register ? "CREATING ACCOUNT..." : "LOGGING IN...")
                  : (register ? "REGISTER" : "LOGIN")}
              </button>

              <div className="auth-card-footer">
                <span className="auth-footer-tag">
                  THE SYSTEM IDENTIFIES YOUR ACCOUNT TYPE AUTOMATICALLY.
                </span>
                <button
                  type="button"
                  className="auth-switch-btn"
                  onClick={() => {
                    setRegister(!register);
                    setError("");
                  }}
                >
                  {register ? "SIGN IN" : "CREATE ACCOUNT"}
                </button>
              </div>
            </form>
          </div>
        </section>
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
  const isRefreshingRef = useRef(false);
  const refresh = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const [plansRes, subRes, workoutRes] = await Promise.allSettled([
        api("/plans"),
        api("/subscription/me"),
        api("/workout-plan/me"),
      ]);
      setData((prev) => ({
        plans: plansRes.status === "fulfilled" && plansRes.value?.plans ? plansRes.value.plans : prev.plans,
        membership: subRes.status === "fulfilled" && subRes.value ? subRes.value.subscription : prev.membership,
        workoutPlan: workoutRes.status === "fulfilled" && workoutRes.value ? workoutRes.value.plan : prev.workoutPlan,
      }));
    } catch (e) {
      setNotice(e.message);
    } finally {
      isRefreshingRef.current = false;
    }
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

      const ensureRazorpay = () => {
        if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve(true);
        return new Promise((resolve) => {
          const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
          if (existing) {
            existing.addEventListener("load", () => resolve(!!window.Razorpay), { once: true });
            existing.addEventListener("error", () => resolve(false), { once: true });
            return;
          }
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.head.appendChild(script);
        });
      };

      const [order] = await Promise.all([
        api("/payments/orders", {
          method: "POST",
          body: JSON.stringify({ planId }),
        }),
        ensureRazorpay(),
      ]);

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
function getPlanTier(plan, allPlans = []) {
  const price = Number(plan?.price) || 0;
  const isFeatured = !!plan?.featured;

  // Dynamically extract unique prices sorted ascending
  const uniquePrices = Array.from(
    new Set(allPlans.map((p) => Number(p.price) || 0))
  ).sort((a, b) => a - b);

  const maxPrice = uniquePrices.length > 0 ? uniquePrices[uniquePrices.length - 1] : 0;
  const totalTiers = uniquePrices.length;
  const rank = uniquePrices.indexOf(price); // 0 = lowest, totalTiers - 1 = highest

  // 1. HIGHEST PRICE PLAN: Automatically receives the ULTRA PREMIUM design (Black + Luxury Gold)
  if (price === maxPrice && maxPrice > 0) {
    return {
      tierKey: "tier-ultra-premium",
      tierKicker: "TIER 04 · ULTRA PREMIUM",
      badge: isFeatured ? "★ MOST POPULAR" : "★ ULTRA PREMIUM",
      badgeClass: "plan-badge-ultra",
      btnClass: "plan-btn-ultra",
    };
  }

  // 2. Only 1 or 2 unique prices:
  if (totalTiers <= 2) {
    return {
      tierKey: "tier-entry",
      tierKicker: "TIER 01 · ESSENTIAL",
      badge: isFeatured ? "★ MOST POPULAR" : "FOUNDATION",
      badgeClass: "plan-badge-entry",
      btnClass: "plan-btn-entry",
    };
  }

  // 3. LOWEST PRICE PLAN (Rank 0): Clean Entry-Level Design
  if (rank === 0) {
    return {
      tierKey: "tier-entry",
      tierKicker: "TIER 01 · ESSENTIAL",
      badge: isFeatured ? "★ MOST POPULAR" : "FOUNDATION",
      badgeClass: "plan-badge-entry",
      btnClass: "plan-btn-entry",
    };
  }

  // 4. HIGH PRICE PLAN (Rank totalTiers - 2, right below highest): Dark Premium with Strong Red/Orange Accent
  if (rank === totalTiers - 2) {
    return {
      tierKey: "tier-high",
      tierKicker: "TIER 03 · ADVANCED",
      badge: isFeatured ? "★ MOST POPULAR" : "HIGH PERFORMANCE",
      badgeClass: "plan-badge-high",
      btnClass: "plan-btn-high",
    };
  }

  // 5. MID PRICE PLAN (Between lowest and high): More Premium Accent, Stronger Hierarchy
  return {
    tierKey: "tier-mid",
    tierKicker: "TIER 02 · ACCELERATOR",
    badge: isFeatured ? "★ MOST POPULAR" : "RECOMMENDED",
    badgeClass: "plan-badge-mid",
    btnClass: "plan-btn-mid",
  };
}

function formatDurationSubtitle(duration, durationUnit) {
  const d = Number(duration) || 1;
  const unit = (durationUnit || "months").toLowerCase();
  let unitText = unit;
  if (unit.startsWith("month")) {
    unitText = d === 1 ? "month" : "months";
  } else if (unit.startsWith("day")) {
    unitText = d === 1 ? "day" : "days";
  } else if (unit.startsWith("year")) {
    unitText = d === 1 ? "year" : "years";
  }
  return `For ${d} ${unitText} of focused training.`;
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
    <div className="membership-view">
      <div className="membership-view-header">
        <span className="membership-kicker">MEMBERSHIP PLANS</span>
        <h2 className="membership-headline">MAKE THE COMMITMENT.</h2>
        <p className="membership-subtitle">
          Flexible plans. Serious results. Cancel the excuses. Choose your training tier below.
        </p>
      </div>
      {membership && (
        <div className="membership-status-banner">
          <div className="status-banner-left">
            <Status status={membership.status} />
            <span className="status-plan-name">{membership.plan?.name}</span>
          </div>
          <span className="status-plan-expiry">
            {membership.status === "EXPIRED" || (membership.endDate && new Date(membership.endDate) <= new Date())
              ? `Expired on ${membership.endDate ? new Date(membership.endDate).toLocaleDateString("en-IN") : "recently"}`
              : `${days} days left · ends ${membership.endDate ? new Date(membership.endDate).toLocaleDateString("en-IN") : "-"}`}
          </span>
        </div>
      )}
      <div className="plans-grid">
        {plans.map((plan) => {
          const tier = getPlanTier(plan, plans);
          const durationText = formatDurationSubtitle(plan.duration, plan.durationUnit);
          const dNum = Number(plan.duration) || 1;
          const unitLabel = dNum === 1
            ? (plan.durationUnit === "DAYS" ? "day" : plan.durationUnit === "YEARS" ? "year" : "month")
            : (plan.durationUnit?.toLowerCase() || "months");

          return (
            <article
              className={`plan-card ${tier.tierKey} ${plan.featured ? "featured" : ""}`}
              key={plan.id}
            >
              <div className="plan-card-topline">
                <span className="plan-tier-kicker">{tier.tierKicker}</span>
                <span className={`plan-tier-badge ${tier.badgeClass}`}>{tier.badge}</span>
              </div>

              <div className="plan-header-block">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-duration-box">
                  <span className="plan-duration-text">{durationText}</span>
                </div>
                {plan.description && (
                  <p className="plan-desc-text">{plan.description}</p>
                )}
              </div>

              <div className="plan-price-block">
                <div className="plan-price-row">
                  <span className="plan-currency-symbol">₹</span>
                  <span className="plan-price-amount">{Number(plan.price).toLocaleString("en-IN")}</span>
                </div>
                <span className="plan-billing-interval">
                  / {dNum} {unitLabel}
                </span>
              </div>

              <div className="plan-card-divider" />

              <div className="plan-features-block">
                <span className="plan-features-heading">WHAT'S INCLUDED:</span>
                <ul className="plan-features-list">
                  {(plan.features || []).map((feature, idx) => (
                    <li key={idx} className="plan-feature-item">
                      <span className="feature-icon-badge">
                        <Check size={13} strokeWidth={2.8} />
                      </span>
                      <span className="feature-item-text">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className={`plan-choose-btn ${tier.btnClass}`}
                onClick={() => { setSelectedPlan(plan); setPaymentError(""); }}
              >
                <span>CHOOSE PLAN</span>
                <ArrowRight size={16} />
              </button>
            </article>
          );
        })}
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
            {user.createdAt
              ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })
              : "Recently"}
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

  const update = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const cleaned = value.replace(/\D/g, "").slice(0, 10);
      setForm((prev) => ({ ...prev, phone: cleaned }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

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
    const phoneDigits = (form.phone || "").trim().replace(/\D/g, "");
    if (!/^[0-9]{10}$/.test(phoneDigits)) return setError("Enter a valid 10-digit mobile number.");
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
      await onCreate({ ...form, phone: phoneDigits });
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
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={update}
              placeholder="9876543210"
              required
            />
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

  const isRefreshingRef = useRef(false);
  const refresh = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
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
    } finally {
      isRefreshingRef.current = false;
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const removeMember = async (member) => {
    try {
      setData((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.id !== member.id),
      }));
      await api(`/members/${member.id}`, { method: "DELETE" });
      setNotice(`Member ${member.name} permanently removed from MongoDB.`);
      refresh().catch(() => {});
    } catch (error) {
      window.alert(error.message);
      refresh().catch(() => {});
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
    if (res?.member) {
      setData((prev) => ({
        ...prev,
        members: [res.member, ...prev.members.filter((m) => m.id !== res.member.id)],
      }));
    }
    setNotice("Member created and saved in MongoDB.");
    refresh().catch(() => {});
  };

  const openWhatsAppUrl = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const sendReminder = async (memberId) => {
    try {
      const response = await api(`/members/${memberId}/send-reminder`, { method: "POST" });
      if (response?.waUrl) {
        openWhatsAppUrl(response.waUrl);
      }
      setNotice(response.message || "WhatsApp opened. Press Send in WhatsApp to deliver.");
      refresh().catch(() => {});
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
      refresh().catch(() => {});
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
      if (res?.waUrl) {
        openWhatsAppUrl(res.waUrl);
      }
      setNotice(res.message || "WhatsApp opened. Press Send in WhatsApp to deliver.");
      refresh().catch(() => {});
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
  const [actionLoading, setActionLoading] = useState({ id: null, action: null });

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
                    disabled={actionLoading.id === m.id}
                    onClick={async () => {
                      if (actionLoading.id === m.id) return;
                      setActionLoading({ id: m.id, action: "reminder" });
                      try {
                        await onSendReminder?.(m.id);
                      } finally {
                        setActionLoading({ id: null, action: null });
                      }
                    }}
                    title="Send WhatsApp renewal reminder"
                  >
                    {actionLoading.id === m.id && actionLoading.action === "reminder" ? "Opening..." : "Send WhatsApp"}
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
                    disabled={actionLoading.id === m.id}
                    onClick={async () => {
                      if (actionLoading.id === m.id) return;
                      setActionLoading({ id: m.id, action: "reminder" });
                      try {
                        await onSendReminder?.(m.id);
                      } finally {
                        setActionLoading({ id: null, action: null });
                      }
                    }}
                    title="Send WhatsApp renewal reminder"
                  >
                    {actionLoading.id === m.id && actionLoading.action === "reminder" ? "Opening..." : "Send WhatsApp"}
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
                  disabled={actionLoading.id === m.id}
                  onClick={async () => {
                    if (actionLoading.id === m.id) return;
                    setActionLoading({ id: m.id, action: "reminder" });
                    try {
                      await onSendReminder?.(m.id);
                    } finally {
                      setActionLoading({ id: null, action: null });
                    }
                  }}
                  title="Send WhatsApp reminder"
                >
                  {actionLoading.id === m.id && actionLoading.action === "reminder" ? "SENDING..." : "REMINDER"}
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
                  disabled={actionLoading.id === m.id}
                  onClick={async () => {
                    if (actionLoading.id === m.id) return;
                    setActionLoading({ id: m.id, action: "welcome" });
                    try {
                      if (onSendWelcome) {
                        await onSendWelcome(m);
                      } else {
                        const creationPwd = getMemberCreationPassword(m.phone) || getMemberCreationPassword(m.id);
                        const waUrl = buildWelcomeWhatsAppUrl(m, plans, creationPwd);
                        openWhatsAppUrl(waUrl);
                      }
                    } finally {
                      setActionLoading({ id: null, action: null });
                    }
                  }}
                  title="Send Welcome WhatsApp message"
                >
                  {actionLoading.id === m.id && actionLoading.action === "welcome" ? "OPENING..." : "WELCOME WHATSAPP"}
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
  const [actionBusyPlanId, setActionBusyPlanId] = useState(null);

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
    setActionBusyPlanId(plan.id);
    try {
      await api(`/plans/${plan.id}`, { method: "PUT", body: JSON.stringify({ active: !plan.active }) });
      setNotice(`Plan ${plan.name} status updated.`);
      await onRefresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setActionBusyPlanId(null);
    }
  };

  const deletePlan = async (plan) => {
    if (!window.confirm(`Are you sure you want to permanently delete plan "${plan.name}"? This will permanently remove it from MongoDB.`)) return;
    setActionBusyPlanId(plan.id);
    try {
      await api(`/plans/${plan.id}`, { method: "DELETE" });
      setNotice(`Plan "${plan.name}" permanently deleted.`);
      await onRefresh();
    } catch (error) {
      window.alert(error.message);
    } finally {
      setActionBusyPlanId(null);
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
          <div className="owner-plan" key={p.id}>
            <div className="plan-number">0{p.duration}</div>
            <div className="owner-plan-details">
              <b>{p.name}</b>
              {p.description && <small className="owner-plan-desc">{p.description}</small>}
              <p className="owner-plan-features">{(p.features || []).join(" · ")}</p>
            </div>
            <strong className="owner-plan-price">{money.format(p.price)}</strong>
            <div className="owner-plan-status-wrap">
              <Status status={p.active ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div className="owner-plan-actions">
              <button
                className="owner-plan-edit-btn"
                disabled={actionBusyPlanId === p.id}
                onClick={() => startEdit(p)}
                title="Edit plan details"
              >
                Edit
              </button>
              <button
                className="icon-button"
                disabled={actionBusyPlanId === p.id}
                onClick={() => togglePlan(p)}
                title={p.active ? "Deactivate plan" : "Activate plan"}
              >
                <ArrowUpRight size={17} />
              </button>
              <button
                className="remove-member"
                disabled={actionBusyPlanId === p.id}
                onClick={() => deletePlan(p)}
                title="Permanently delete plan from MongoDB"
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
  const [activeNoticeId, setActiveNoticeId] = useState(null);
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
                  disabled={activeNoticeId === n.id}
                  onClick={async () => {
                    if (activeNoticeId === n.id) return;
                    setActiveNoticeId(n.id);
                    try {
                      await onSendReminder(n.id);
                    } finally {
                      setActiveNoticeId(null);
                    }
                  }}
                >
                  {activeNoticeId === n.id ? "Opening..." : "Send WhatsApp"}
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
  let content = null;
  if (view === "member" && user) {
    content = (
      <MemberApp
        user={user}
        onLogout={logout}
        initialPage={initialPage}
        initialPlanId={initialPlanId}
      />
    );
  } else if (view === "owner" && user) {
    content = <OwnerApp user={user} onLogout={logout} />;
  } else if (view === "login") {
    content = (
      <Auth
        mode="member"
        onSuccess={success}
        onBack={() => setView("landing")}
      />
    );
  } else if (view === "owner-login") {
    content = (
      <Auth
        mode="owner"
        onSuccess={success}
        onBack={() => setView("landing")}
      />
    );
  } else if (view === "register") {
    content = (
      <Auth
        mode="register"
        onSuccess={success}
        onBack={() => setView("landing")}
      />
    );
  } else {
    content = (
      <Landing
        onLogin={(m) => setView(m === "owner" ? "owner-login" : "login")}
        onRegister={() => setView("register")}
      />
    );
  }
  return <ErrorBoundary>{content}</ErrorBoundary>;
}
