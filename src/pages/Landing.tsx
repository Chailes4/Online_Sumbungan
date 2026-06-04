import { useState, useEffect, useRef, type RefObject } from "react";
import { Link, useNavigate } from "react-router-dom";


// ─── Types ────────────────────────────────────────────────────────────────────

interface NavLink { label: string; href: string; }
interface Step { icon: string; title: string; description: string; rotation: string; }
interface ResolvedIssue { before: string; after: string; category: string; resolvedAt: string; title: string; description: string; }
interface Stat { value: string; label: string; color: string; }
interface ContactInfo { icon: string; label: string; value: string; accent: boolean; }
interface FooterLink { label: string; href: string; }

type RevealDirection = "up" | "down" | "left" | "right" | "none";

// ─── Constants ────────────────────────────────────────────────────────────────

const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "#home" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "About Us", href: "#about-us" },
  { label: "Contact", href: "#contact-us" },
];

const STEPS: Step[] = [
  {
    icon: "campaign",
    title: "1. Report an Issue",
    description: "Submit details about community concerns, road maintenance, or public safety needs via our easy-to-use form.",
    rotation: "group-hover:rotate-3",
  },
  {
    icon: "thumb_up",
    title: "2. Community Upvote",
    description: "The community votes on reported issues to help authorities prioritize the most urgent and widespread concerns.",
    rotation: "group-hover:-rotate-3",
  },
  {
    icon: "gavel",
    title: "3. Municipal Action",
    description: "Municipal departments review reports, assign personnel, and update the community as they resolve the issues.",
    rotation: "group-hover:rotate-3",
  },
];

const RESOLVED_ISSUES: ResolvedIssue[] = [
  {
    before: "https://lh3.googleusercontent.com/aida-public/AB6AXuBh7AiXFZ3wLzWod5QjkvHPWoVTjvWSJIfGGyjBTWvkjh36EVt_IaGjoU8_15IFRKXMmKtl9sPDf3CCLmGY7u2kxKwZDAKgVs3fPyKi4E7us_A3Vf5Bp-XPB7xLMvV1kf0tjHmMN14qwuM66g9sTY_ZHMdiCDqrD2LKeEEYutDFrF6hJUwLckj3sABx6EKOFA4c53NUHYTvOi4765VXHVxrWGar45gG2HRoZQUPNGhCAg-ZfFU02J3rRGPD3yrEkhTohwmtus0u3xo",
    after: "https://lh3.googleusercontent.com/aida-public/AB6AXuAkckhH-6278Fu0CjBGx-jYyd63JJGMoLDJOFpIFXtXK9B17NHw1VdOnZfuSMcVWR2dp0mbCOVuU_zqhL6KLkM00BgD-6-xM0JATD7ql7b-Qme5534kWZDxqWkW-rCV4Mfs1ssSuPC7yU9d3xFDWE4YYiXNc9PfUljaZU6kR9CsMdS3mzaCqpZGNaqyY9rx4yJQfzUKxe-i1evaRxv01-6KdmkfwxAM4Av32vsEAgIuwMRA_5cPILfS0aUwcw_ClxgImB7kGN-8fc8",
    category: "Road Maintenance",
    resolvedAt: "Resolved: 48 hours ago",
    title: "Pothole Repair at Quingua Bridge Approach",
    description: "Action taken: Full resurfacing of the damaged section after 152 community upvotes.",
  },
  {
    before: "https://lh3.googleusercontent.com/aida-public/AB6AXuDdOOJNHqKuj7oqTyiLJC1Q2uh1SJwGEzEC9asQIGYvD9K-Crm1XtZXYuhllMKYgj4vKbareH8zmarGeGJD8KvxzrpjDsLwJ_kBEJ0dLkotQVeLS8H3QrCIQ_WrAvJFLUiexvmiw-rZqer-SuhdieQRQMVn2oeBg8taQmQCVSEdv3qOqyTDI4aRkwHNv-xcFBVWoGpflMxsAqJjIIuuWVRZwVJ4onBlk-IsX6El3u8NYkFQg5WJVMEjW6FYBOud1fKphU9Mg-7PEH0",
    after: "https://lh3.googleusercontent.com/aida-public/AB6AXuA4sezUsJP6X_j6fU0OaqJcEczzb1Q15Lw_Ic3PLxwZbpLiHgkqT7Nxz5CCuy-QpvqthCAFytWkJmLIxqTe9BkW5baG5UHG29wbV_P5wRiprvx6a4m6sZxOxXAsMCsz6y2Q5fddMQbh0noj-bls7NQ_COB0GzksNuZoZ_7T0fn-64tmi20rY1SW5u9r89dYFWk0Vip0NKH5qeQDFvvNmMvQgwx9oIoA6HAhmwHxWdwZwS5VZNNGj3BNt5KVT59ZpOKWKZ5hjzoMCaQ",
    category: "Public Lighting",
    resolvedAt: "Resolved: 3 days ago",
    title: "Streetlight Replacement in Brgy. Banga 1st",
    description: "Action taken: Installed new energy-efficient LED fixtures along the main residential strip.",
  },
];

const STATS: Stat[] = [
  { value: "100%", label: "Transparent", color: "text-blue-600" },
  { value: "24/7", label: "Citizen Support", color: "text-yellow-500" },
];

const CONTACT_INFO: ContactInfo[] = [
  { icon: "location_on", label: "Our Address", value: "Poblacion, Plaridel, Bulacan", accent: false },
  { icon: "schedule", label: "Office Hours", value: "Mon – Fri, 8AM – 5PM", accent: true },
];

const FOOTER_QUICK_LINKS: FooterLink[] = [
  { label: "Terms of Service", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Accessibility", href: "#" },
  { label: "Open Data Portal", href: "#" },
];

const FOOTER_SERVICES: FooterLink[] = [
  { label: "Report a Pothole", href: "#" },
  { label: "Garbage Collection", href: "#" },
  { label: "Public Safety", href: "#" },
  { label: "Traffic Management", href: "#" },
];

// ─── useInView hook ───────────────────────────────────────────────────────────

function useInView<T extends Element>(options?: IntersectionObserverInit): [RefObject<T>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref as RefObject<T>, inView];
}

// ─── Reveal wrapper ───────────────────────────────────────────────────────────

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  direction?: RevealDirection;
}

function Reveal({ children, delay = 0, className = "", direction = "up" }: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>();

  const transforms: Record<RevealDirection, string> = {
    up: "translateY(40px)",
    down: "translateY(-40px)",
    left: "translateX(-40px)",
    right: "translateX(40px)",
    none: "none",
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : transforms[direction],
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── MaterialIcon ─────────────────────────────────────────────────────────────

interface MaterialIconProps { name: string; className?: string; }

function MaterialIcon({ name, className = "" }: MaterialIconProps) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-slate-200 transition-all duration-500 ${
        scrolled ? "bg-white/97 shadow-lg shadow-slate-200/60 backdrop-blur-md" : "bg-white/80 backdrop-blur-md"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-lg group-hover:shadow-blue-700/40">
              <MaterialIcon name="account_balance" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-blue-700">
              Sumbungan ng <span className="text-yellow-500">Plaridel</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative text-sm font-semibold text-slate-700 hover:text-blue-700 transition-colors duration-200 after:absolute after:bottom-[-4px] after:left-0 after:h-0.5 after:w-0 after:bg-blue-700 after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
            <div className="h-6 w-px bg-slate-300 mx-2" />
           <Link
              to="/Login"
              className="relative text-sm font-semibold text-slate-700 hover:text-white-700 transition-colors duration-200 after:absolute after:bottom-[-4px] after:left-0 after:h-0.5 after:w-0 after:bg-blue-700 after:transition-all after:duration-300 hover:after:w-full" >
              Login
            </Link>

            <Link to="/Register" 
            className="text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors">
              <button className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-700/20 hover:bg-blue-800 hover:scale-105 hover:shadow-xl hover:shadow-blue-700/30 active:scale-95 transition-all duration-200">
                Register
              </button>
            </Link>

          </nav>

          <button
            className="md:hidden text-slate-600 hover:text-blue-700 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <MaterialIcon name={menuOpen ? "close" : "menu"} className="text-3xl" />
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-3 border-t border-slate-100 pt-4 animate-fadeIn">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-sm font-semibold text-slate-700 hover:text-blue-700 hover:pl-2 py-1 transition-all duration-200"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
                <Link to="/Register" className="text-sm font-semibold text-blue-700 hover:text-blue-900 transition-colors">
              <button className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 transition-colors">
                Register
              </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// ─── HeroSection ──────────────────────────────────────────────────────────────

function HeroSection() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="relative w-full" id="home">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent z-10" />
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDtRlS4NXzK3UxB9vrNQKEd-murB0FX27IanN4-BifiCBcX2tvhtF3GzEl0cF5DsTpR27m73mJuXNGRpzmM7A_KZ1d93igqqzsKm705Itb9ChfwXQUn6griYsurT8lRYpkmwtULW5MTlumtue7YvpGIumylCsFpG2LjPmeEfL2qXlI9X2KmXa4XY-FPmwzC8589AyN5JSUhRgtYPRGYRRx7qnNxPIkOAF6xlzv6Tn4wyBESxg9Feb-9mEx6qNj8nyw6bH7KQaOJ34"
          alt="Plaridel Landmark"
          className="h-full w-full object-cover"
          style={{ transition: "transform 8s ease-out", transform: loaded ? "scale(1)" : "scale(1.05)" }}
        />
      </div>

      <div className="relative z-20 max-w-7xl mx-auto px-4 py-32 sm:px-6 lg:px-8 flex flex-col items-start justify-center min-h-[600px]">
        <div className="max-w-2xl space-y-8">
          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(20px)", transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s" }}
            className="inline-flex items-center rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-yellow-400 border border-yellow-500/30"
          >
            Official Citizen Portal
          </div>

          <h1 style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(30px)", transition: "opacity 0.7s ease 0.25s, transform 0.7s cubic-bezier(0.22,1,0.36,1) 0.25s" }}
            className="text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl"
          >
            Isumbong mo sa <span className="text-yellow-400">Plaridel</span>
          </h1>

          <p style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(20px)", transition: "opacity 0.7s ease 0.4s, transform 0.7s ease 0.4s" }}
            className="text-xl text-slate-200 font-medium leading-relaxed"
          >
            Boses ng Mamamayan, Aksyon ng Bayan. A community reporting and discussion platform empowering citizens to drive real municipal action.
          </p>

          <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "none" : "translateY(20px)", transition: "opacity 0.7s ease 0.55s, transform 0.7s ease 0.55s" }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={() => navigate("/Login")}
              className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-700/30 hover:scale-105 hover:bg-blue-600 hover:shadow-2xl hover:shadow-blue-700/40 active:scale-95 transition-all duration-200"
            >
              Start Reporting Now
              <MaterialIcon name="arrow_forward" className="ml-2" />
            </button>
            <button
              onClick={() => navigate("/Login")}
              className="inline-flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-md border border-white/20 px-8 py-4 text-lg font-bold text-white hover:bg-white/20 hover:border-white/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              View Active Reports
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── HowItWorksSection ────────────────────────────────────────────────────────

function HowItWorksSection() {
  const [titleRef, titleInView] = useInView<HTMLDivElement>();

  return (
    <section className="py-24 bg-white" id="how-it-works">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={titleRef}
          className="text-center max-w-3xl mx-auto mb-16"
          style={{ opacity: titleInView ? 1 : 0, transform: titleInView ? "none" : "translateY(30px)", transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)" }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">How it Works</h2>
          <div className="mt-4 h-1.5 w-20 bg-yellow-500 mx-auto rounded-full" />
          <p className="mt-6 text-lg text-slate-600">Making our community better together in three simple, transparent steps.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 150} direction="up">
              <div className="relative flex flex-col items-center text-center group cursor-default">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px+48px)] h-px bg-slate-200 z-0" />
                )}
                <div className={`relative z-10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-700/10 text-blue-700 transition-all duration-300 group-hover:bg-blue-700 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-700/30 group-hover:scale-110 ${step.rotation}`}>
                  <MaterialIcon name={step.icon} className="text-4xl" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors duration-200">{step.title}</h3>
                <p className="mt-4 text-slate-600 leading-relaxed px-4 group-hover:text-slate-700 transition-colors duration-200">{step.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── IssueCard ────────────────────────────────────────────────────────────────

interface IssueCardProps { issue: ResolvedIssue; delay?: number; }

function IssueCard({ issue, delay = 0 }: IssueCardProps) {
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(40px)", transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}ms` }}
      className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200 hover:shadow-2xl hover:-translate-y-2 hover:border-blue-100 transition-all duration-300 group"
    >
      <div className="grid grid-cols-2">
        <div className="relative aspect-video lg:aspect-square overflow-hidden">
          <img src={issue.before} alt="Before" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute top-2 left-2 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-1 rounded">BEFORE</div>
        </div>
        <div className="relative aspect-video lg:aspect-square overflow-hidden">
          <img src={issue.after} alt="After" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute top-2 left-2 bg-blue-700/80 text-white text-[10px] font-bold px-2 py-1 rounded">AFTER</div>
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-blue-700 uppercase bg-blue-700/10 px-2 py-1 rounded group-hover:bg-blue-700 group-hover:text-white transition-all duration-200">{issue.category}</span>
          <span className="text-xs text-slate-500">{issue.resolvedAt}</span>
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors duration-200">{issue.title}</h3>
        <p className="text-slate-600 text-sm">{issue.description}</p>
      </div>
    </div>
  );
}

// ─── ResolvedIssuesSection ────────────────────────────────────────────────────

function ResolvedIssuesSection() {
  const [headRef, headInView] = useInView<HTMLDivElement>();

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headRef}
          className="flex items-end justify-between mb-12"
          style={{ opacity: headInView ? 1 : 0, transform: headInView ? "none" : "translateY(20px)", transition: "opacity 0.6s ease, transform 0.6s ease" }}
        >
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Latest Resolved Issues</h2>
            <p className="mt-2 text-slate-600">See the impact of your voice in action across Plaridel.</p>
          </div>
          <a href="#login" className="hidden sm:flex items-center text-blue-700 font-bold hover:text-blue-900 transition-all duration-200 group">
            View all success stories
            <MaterialIcon name="chevron_right" className="ml-1 group-hover:translate-x-1 transition-transform duration-200" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {RESOLVED_ISSUES.map((issue, i) => (
            <IssueCard key={issue.title} issue={issue} delay={i * 150} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── AboutSection ─────────────────────────────────────────────────────────────

function AboutSection() {
  const [imgRef, imgInView] = useInView<HTMLDivElement>();
  const [textRef, textInView] = useInView<HTMLDivElement>();

  return (
    <section className="py-24 bg-white" id="about-us">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div
            ref={imgRef}
            className="relative group"
            style={{ opacity: imgInView ? 1 : 0, transform: imgInView ? "none" : "translateX(-50px)", transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(0.22,1,0.36,1)" }}
          >
            <div className="absolute -inset-4 bg-yellow-500/20 rounded-2xl blur-lg transition-all duration-500 group-hover:bg-yellow-500/35 group-hover:blur-xl" />
            <div className="relative rounded-2xl overflow-hidden border-4 border-white shadow-2xl transition-all duration-500 group-hover:border-yellow-200">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJrOCO_KhuwQUTUD_gjOtP0cojniIMjbOZFT61Lg_MLwt0D6P2EhrdOMRxQtdvkWl0ee49skty6FOH5L3r6l8vWAtEl7NgJbAvtcfmQFqXubd2KvRo4vAnWfU6tqoygGol8fIYNcoxP2JXBEpNYBpTCFQYfkqyabOBXGJbVM3PBrPA5Av4AcNDHnQDKAUm0Cdaoi0w7thTnP-BJKxL09-Uw_-OTywAVH08qayJJ_pT0VBgkeu_NCkuIp8242Mn7UCNImt8qzytNUg"
                alt="Plaridel Municipal Hall"
                className="w-full h-auto object-cover aspect-[4/3] transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-blue-700 rounded-full border-8 border-white hidden sm:flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-600 group-hover:shadow-xl group-hover:shadow-blue-700/40">
              <MaterialIcon name="verified" className="text-white text-5xl" />
            </div>
          </div>

          <div
            ref={textRef}
            className="space-y-6"
            style={{ opacity: textInView ? 1 : 0, transform: textInView ? "none" : "translateX(50px)", transition: "opacity 0.8s ease 0.15s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.15s" }}
          >
            <div className="inline-flex items-center gap-2 text-blue-700 font-bold text-sm tracking-widest uppercase">
              <span className="h-px w-8 bg-blue-700" /> Our Mission
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 leading-tight">Empowering Citizens Through Transparency</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Sumbungan sa Plaridel was established as a bridge between the local government and its people. We believe that a progressive municipality is built on open communication and accountability.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              Our platform empowers every resident to be the eyes and ears of our community, ensuring that concerns are heard, prioritized, and acted upon. By making community reporting transparent, we foster a culture of shared responsibility and rapid municipal action.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-6">
              {STATS.map((stat, i) => (
                <div
                  key={stat.label}
                  className="space-y-2 p-4 rounded-xl border border-slate-100 hover:border-blue-100 hover:bg-blue-50/50 hover:shadow-md transition-all duration-300 cursor-default group"
                  style={{ opacity: textInView ? 1 : 0, transform: textInView ? "none" : "translateY(20px)", transition: `opacity 0.6s ease ${0.3 + i * 0.1}s, transform 0.6s ease ${0.3 + i * 0.1}s` }}
                >
                  <span className={`text-3xl font-black ${stat.color} group-hover:scale-110 inline-block transition-transform duration-200`}>{stat.value}</span>
                  <p className="text-sm font-bold text-slate-500 uppercase">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── ContactSection ───────────────────────────────────────────────────────────

function ContactSection() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [formRef, formInView] = useInView<HTMLDivElement>();
  const [mapRef, mapInView] = useInView<HTMLDivElement>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const inputClass = "w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent hover:border-slate-400 transition-all duration-200";

  return (
    <section className="py-24 bg-slate-50" id="contact-us">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Get in Touch</h2>
          <div className="mt-4 h-1.5 w-20 bg-yellow-500 mx-auto rounded-full" />
          <p className="mt-6 text-lg text-slate-600">Have questions about the platform or need further assistance? We're here to help.</p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div
            ref={formRef}
            style={{ opacity: formInView ? 1 : 0, transform: formInView ? "none" : "translateX(-40px)", transition: "opacity 0.8s ease, transform 0.8s cubic-bezier(0.22,1,0.36,1)" }}
            className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-shadow duration-500"
          >
            {submitted && (
              <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
                <MaterialIcon name="check_circle" className="text-green-500" />
                Message sent successfully! We'll get back to you soon.
              </div>
            )}
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                  <input id="name" type="text" placeholder="Juan Dela Cruz" value={formData.name} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                  <input id="email" type="email" placeholder="juan@example.ph" value={formData.email} onChange={handleChange} className={inputClass} />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                <input id="subject" type="text" placeholder="How can we help?" value={formData.subject} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-bold text-slate-700 mb-2">Message</label>
                <textarea id="message" rows={4} placeholder="Describe your inquiry..." value={formData.message} onChange={handleChange} className={inputClass} />
              </div>
              <button
                onClick={handleSubmit}
                className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg shadow-lg shadow-blue-700/30 hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-700/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                Send Message
                <MaterialIcon name="send" />
              </button>
            </div>
          </div>

          <div
            ref={mapRef}
            className="flex flex-col h-full"
            style={{ opacity: mapInView ? 1 : 0, transform: mapInView ? "none" : "translateX(40px)", transition: "opacity 0.8s ease 0.15s, transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.15s" }}
          >
            <div className="flex-grow rounded-2xl overflow-hidden shadow-xl border border-slate-200 mb-8 bg-slate-100 relative min-h-[300px]">
            <iframe
              title="Plaridel Municipal Hall Map"
              src="https://www.google.com/maps?q=Plaridel%20Municipal%20Hall%20Bulacan&output=embed"
              className="w-full h-full"
              loading="lazy"
            ></iframe>
          </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {CONTACT_INFO.map((info, i) => (
                <div
                  key={info.label}
                  className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group"
                  style={{ opacity: mapInView ? 1 : 0, transform: mapInView ? "none" : "translateY(20px)", transition: `opacity 0.5s ease ${0.3 + i * 0.1}s, transform 0.5s ease ${0.3 + i * 0.1}s` }}
                >
                  <div className={`p-2 rounded-lg transition-all duration-200 group-hover:scale-110 ${info.accent ? "bg-yellow-500/10 text-yellow-600 group-hover:bg-yellow-500/20" : "bg-blue-700/10 text-blue-700 group-hover:bg-blue-700/20"}`}>
                    <MaterialIcon name={info.icon} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{info.label}</p>
                    <p className="text-xs text-slate-600">{info.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const [ref, inView] = useInView<HTMLElement>();

  return (
    <footer
      ref={ref}
      className="bg-slate-900 text-slate-300 py-16"
      style={{ opacity: inView ? 1 : 0, transform: inView ? "none" : "translateY(30px)", transition: "opacity 0.8s ease, transform 0.8s ease" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 border-b border-slate-800 pb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-700 text-white transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <MaterialIcon name="account_balance" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">Sumbungan Plaridel</span>
            </div>
            <p className="text-sm leading-relaxed">The official citizen feedback and community reporting portal of Plaridel, Bulacan. We listen, we act, we improve.</p>
            <div className="flex gap-4">
              {["social_leaderboard", "alternate_email"].map((icon) => (
                <a key={icon} href="#" className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-800 hover:bg-blue-700 hover:scale-110 hover:-translate-y-1 transition-all duration-200">
                  <MaterialIcon name={icon} className="text-xl" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-sm">
              {FOOTER_QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-yellow-500 hover:pl-2 transition-all duration-200 inline-block">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Our Services</h4>
            <ul className="space-y-4 text-sm">
              {FOOTER_SERVICES.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-yellow-500 hover:pl-2 transition-all duration-200 inline-block">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6">Contact Us</h4>
            <ul className="space-y-4 text-sm">
              {[
                { icon: "location_on", text: "Municipal Hall, Plaridel, Bulacan 3004" },
                { icon: "call", text: "(044) 795-0123 / 795-4567" },
                { icon: "mail", text: "contact@plaridel.gov.ph" },
              ].map((item) => (
                <li key={item.text} className="flex gap-3 group hover:text-white transition-colors duration-200 cursor-default">
                  <MaterialIcon name={item.icon} className="text-yellow-500 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-slate-500">© 2025 Municipality of Plaridel. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-slate-500">System Status: Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function SumbunganLanding() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 1024); // below lg breakpoint
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  if (isMobile) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-8 shadow-2xl">


        {/* Title */}
        <h1 className="text-3xl font-extrabold text-white mb-3">
          Desktop Version Only
        </h1>

        {/* Description */}
        <p className="text-slate-300 leading-relaxed mb-6">
          Sumbungan ng Plaridel is currently optimized for desktop and laptop
          devices. Please access this page using a larger screen for the best
          experience.
        </p>

        {/* Divider */}
        <div className="w-16 h-1 bg-yellow-500 rounded-full mx-auto mb-6"></div>

        {/* Info Box */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-left">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-yellow-400">
              info
            </span>
            <p className="text-sm text-slate-300">
              Mobile support is currently under development. Please visit using
              a desktop browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

  

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      <style>{`
        html, body {
          height: 100%;
          overflow-y: auto;
          scroll-behavior: smooth;
          margin: 0;
          padding: 0;
        }
        #root, #__next { min-height: 100%; }
        body, * { font-family: 'Public Sans', sans-serif; box-sizing: border-box; }
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          display: inline-flex; align-items: center;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out; }
        button, a { -webkit-tap-highlight-color: transparent; }
      `}</style>

      <div className="bg-slate-50 text-slate-900">
        <Header />
        <main>
          <HeroSection />
          <HowItWorksSection />
          <ResolvedIssuesSection />
          <AboutSection />
          <ContactSection />
        </main>
        <Footer />
      </div>
    </>
  );
}
