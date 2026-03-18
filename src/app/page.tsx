"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const questions = [
  "I learn for hours and cannot remember a single thing the next day",
  "I keep rebuilding the perfect learning plan instead of actually learning",
  "Why does nothing stick after hours of reading?",
  "My brain feels like it has too many tabs open",
  "I highlighted the entire textbook and still failed",
  "Nobody taught me HOW to learn, just WHAT to learn",
  "I have access to more information than ever and somehow feel less prepared",
  "I watch a 2-hour lecture and by the end cannot recall the first 20 minutes",
  "I feel like I understand until someone asks me to explain",
  "How do I know what I don't know?",
  "I am hoarding knowledge I will never actually absorb",
  "I spend more time organising my resources than actually learning",
  "It is not that I do not want to learn. I just hate how broken the process is.",
];


const dummyActionItems = {
  foundation: [
    {
      title: "Identify the key stages of cellular respiration",
      description:
        "List the three main stages (glycolysis, Krebs cycle, electron transport chain) and where each occurs in the cell.",
    },
    {
      title: "Define ATP and its role",
      description:
        "Explain what adenosine triphosphate is and why cells need it as an energy currency.",
    },
    {
      title: "Describe the structure of mitochondria",
      description:
        "Sketch and label the outer membrane, inner membrane, cristae, and matrix.",
    },
  ],
  solidification: [
    {
      title: "Compare aerobic and anaerobic respiration",
      description:
        "Explain the conditions, inputs, outputs, and efficiency of each pathway.",
    },
    {
      title: "Trace the electron transport chain",
      description:
        "Walk through how NADH and FADH2 donate electrons, and how this creates the proton gradient.",
    },
    {
      title: "Explain chemiosmosis",
      description:
        "Describe how the proton gradient drives ATP synthase and calculate the net ATP yield.",
    },
  ],
  mastery: [
    {
      title: "Evaluate why cyanide is lethal at the cellular level",
      description:
        "Explain which specific complex cyanide inhibits and the cascade of effects on ATP production.",
    },
    {
      title: "Design an experiment to measure metabolic rate",
      description:
        "Propose a method using oxygen consumption or CO2 production, identifying controls and variables.",
    },
  ],
};

const previewChips = [
  "Mitochondria and cellular respiration",
  "Introduction to neural networks",
  "Cognitive behavioural therapy",
];

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly"
  );
  const [previewQuery, setPreviewQuery] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoEmail, setPromoEmail] = useState("");
  const [promoPassword, setPromoPassword] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pricingRef = useRef<HTMLDivElement>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), billingPeriod }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong");
        setLoading(false);
      }
    } catch {
      alert("Failed to start checkout");
      setLoading(false);
    }
  };

  const scrollToPricing = () => {
    pricingRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handlePreviewGenerate = (query?: string) => {
    if (query) setPreviewQuery(query);
    setPreviewActive(false);
    setPreviewLoading(true);
    setTimeout(() => {
      setPreviewLoading(false);
      setPreviewActive(true);
    }, 1500);
  };

  return (
    <div
      className="min-h-screen bg-white text-[#0A0909]"
      style={{ fontFamily: "var(--font-figtree), sans-serif" }}
    >
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[rgba(2,1,1,0.07)]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Socraty"
              className="h-8 object-contain"
            />
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#666]">
            <a href="#how-it-works" className="hover:text-[#0A0909] transition">
              How it works
            </a>
            <a href="#how-it-works" className="hover:text-[#0A0909] transition">
              Features
            </a>
            <a href="#comparison" className="hover:text-[#0A0909] transition">
              Compare
            </a>
            <a
              href="/enterprise"
              className="hover:text-[#0A0909] transition"
            >
              Enterprise
            </a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login")}
              className="text-sm text-[#666] hover:text-[#0A0909] transition hidden sm:block"
            >
              Sign in
            </button>
            <a
              href="/enterprise"
              className="hidden sm:inline-flex text-sm font-medium text-[#666] hover:text-[#0A0909] px-4 py-2.5 rounded-full border border-[rgba(2,1,1,0.12)] hover:border-[rgba(2,1,1,0.25)] transition"
            >
              Book a demo
            </a>
            <button
              onClick={scrollToPricing}
              className="bg-[#0A0909] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#333] transition hidden sm:block"
            >
              Get Started Free
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#333]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[rgba(2,1,1,0.07)] bg-white px-6 py-4 space-y-3">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[#666] hover:text-[#0A0909] transition">
              How it works
            </a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[#666] hover:text-[#0A0909] transition">
              Features
            </a>
            <a href="#comparison" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-[#666] hover:text-[#0A0909] transition">
              Compare
            </a>
            <a href="/enterprise" className="block text-sm text-[#666] hover:text-[#0A0909] transition">
              Enterprise
            </a>
            <div className="border-t border-[rgba(2,1,1,0.07)] pt-3 flex flex-col gap-2">
              <button
                onClick={() => { setMobileMenuOpen(false); router.push("/login"); }}
                className="text-sm text-[#666] hover:text-[#0A0909] transition text-left"
              >
                Sign in
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); scrollToPricing(); }}
                className="bg-[#0A0909] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#333] transition text-center"
              >
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-[1200px] mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
          <div className="flex-1 max-w-[640px]">
            <p className="text-sm font-semibold text-[#666] mb-4 tracking-wide">
              The learning execution engine
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-[56px] font-black leading-[1.08] tracking-[-0.03em] mb-6" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
              Your AI learning agent that turns scattered materials into a learning execution system
            </h1>
            <p className="text-[#666] text-lg leading-relaxed mb-8 max-w-[520px]">
              Stop juggling 20 tabs. Upload your materials, tell Socraty
              your goals, and receive specific, time-boxed learning actions
              every day, all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={scrollToPricing}
                className="bg-[#0A0909] text-white font-semibold px-8 py-3.5 rounded-full text-sm hover:bg-[#333] transition"
              >
                Get your own learning agent
              </button>
              <a
                href="#how-it-works"
                className="flex items-center justify-center gap-2 text-sm font-medium text-[#666] hover:text-[#0A0909] px-6 py-3.5 rounded-full border border-[rgba(2,1,1,0.12)] hover:border-[rgba(2,1,1,0.25)] transition"
              >
                Meet Agent Socraty
                <span className="text-xs">↗</span>
              </a>
            </div>
          </div>
          <div className="flex-shrink-0 relative w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] md:w-[500px] md:h-[500px]">
            {/* Mascot centre */}
            <img
              src="/mascot.png"
              alt="Agent Socraty"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 sm:w-52 sm:h-52 md:w-64 md:h-64 object-contain drop-shadow-xl z-10"
            />

            {/* Inner orbit ring (visual) */}
            <div className="absolute rounded-full border border-dashed border-[rgba(0,0,0,0.07)] animate-orbit-inner" style={{ top: '25%', left: '25%', right: '25%', bottom: '25%' }} />

            {/* Inner orbit items — tools */}
            <div className="absolute inset-0 animate-orbit-inner">
              {[
                { angle: 0, src: "/icons/gcal.svg", alt: "Google Calendar", href: "https://calendar.google.com" },
                { angle: 60, src: "/icons/apple.svg", alt: "Apple Calendar", href: "https://www.icloud.com/calendar" },
                { angle: 120, src: "/icons/gdrive.svg", alt: "Google Drive", href: "https://drive.google.com" },
                { angle: 180, src: "/icons/onedrive.svg", alt: "OneDrive", href: "https://onedrive.live.com" },
                { angle: 240, src: "/icons/notion-icon.svg", alt: "Notion", href: "https://www.notion.so" },
                { angle: 300, src: "/icons/gdocs.svg", alt: "Google Docs", href: "https://docs.google.com" },
              ].map((item, i) => {
                const rad = (item.angle - 90) * (Math.PI / 180);
                const r = 25;
                const x = 50 + r * Math.cos(rad);
                const y = 50 + r * Math.sin(rad);
                return (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2 animate-counter-orbit-inner"
                    style={{ top: `${y}%`, left: `${x}%` }}
                  >
                    <a href={item.href} target="_blank" rel="noopener noreferrer" title={item.alt} className="block w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center hover:scale-110 transition-transform cursor-pointer" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)' }}>
                      <img src={item.src} alt={item.alt} className="w-5 h-5" />
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Middle orbit ring (visual) */}
            <div className="absolute rounded-full border border-dashed border-[rgba(0,0,0,0.05)] animate-orbit-outer" style={{ top: '13%', left: '13%', right: '13%', bottom: '13%' }} />

            {/* Middle orbit items — YouTube + journals */}
            <div className="absolute inset-0 animate-orbit-outer">
              {[
                { angle: 0, src: "/icons/youtube.svg", alt: "YouTube", href: "https://www.youtube.com" },
                { angle: 45, src: "/icons/pubmed.svg", alt: "PubMed", href: "https://pubmed.ncbi.nlm.nih.gov" },
                { angle: 90, src: "/icons/jstor.svg", alt: "JSTOR", href: "https://www.jstor.org" },
                { angle: 135, src: "/icons/arxiv.svg", alt: "arXiv", href: "https://arxiv.org" },
                { angle: 180, src: "/icons/scholar.svg", alt: "Google Scholar", href: "https://scholar.google.com" },
                { angle: 225, src: "/icons/nature.svg", alt: "Nature", href: "https://www.nature.com" },
                { angle: 270, src: "/icons/springer.svg", alt: "Springer", href: "https://www.springer.com" },
                { angle: 315, src: "/icons/sheets.svg", alt: "Google Sheets", href: "https://sheets.google.com" },
              ].map((item, i) => {
                const rad = (item.angle - 90) * (Math.PI / 180);
                const r = 37;
                const x = 50 + r * Math.cos(rad);
                const y = 50 + r * Math.sin(rad);
                return (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2 animate-counter-orbit-outer"
                    style={{ top: `${y}%`, left: `${x}%` }}
                  >
                    <a href={item.href} target="_blank" rel="noopener noreferrer" title={item.alt} className="block w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center hover:scale-110 transition-transform cursor-pointer" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)' }}>
                      <img src={item.src} alt={item.alt} className="w-5 h-5" />
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Outer orbit ring (visual) — file formats */}
            <div className="absolute rounded-full border border-dashed border-[rgba(0,0,0,0.04)] animate-orbit-slow" style={{ top: '1%', left: '1%', right: '1%', bottom: '1%' }} />

            {/* Outer orbit items — file formats */}
            <div className="absolute inset-0 animate-orbit-slow">
              {[
                { angle: 0, src: "/icons/pdf.svg", alt: "PDF" },
                { angle: 45, src: "/icons/word.svg", alt: "Word" },
                { angle: 90, src: "/icons/excel.svg", alt: "Excel" },
                { angle: 135, src: "/icons/powerpoint.svg", alt: "PowerPoint" },
                { angle: 180, src: "/icons/slides.svg", alt: "Slides" },
                { angle: 225, src: "/icons/notes.svg", alt: "Notes" },
                { angle: 270, src: "/icons/article.svg", alt: "Articles" },
                { angle: 315, src: "/icons/website.svg", alt: "Websites" },
              ].map((item, i) => {
                const rad = (item.angle - 90) * (Math.PI / 180);
                const r = 49;
                const x = 50 + r * Math.cos(rad);
                const y = 50 + r * Math.sin(rad);
                return (
                  <div
                    key={i}
                    className="absolute -translate-x-1/2 -translate-y-1/2 animate-counter-orbit-slow"
                    style={{ top: `${y}%`, left: `${x}%` }}
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)' }}>
                      <img src={item.src} alt={item.alt} className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Integrations ── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111]">
              Connected to everything you need
            </h2>
            <p className="mt-2 text-[#666] text-base">
              Your tools, courses, and research libraries, all in one place
            </p>
          </div>

          <div className="rounded-2xl bg-[#fafafa] border border-[rgba(0,0,0,0.06)] p-6 sm:p-8" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.04)' }}>
            {/* Tools */}
            <p className="text-[11px] font-semibold text-[#999] tracking-widest uppercase mb-4 text-center">Tools</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
              {[
                { name: "Google Calendar", href: "https://calendar.google.com", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="1.5" fill="none" /><path d="M3 9h18" stroke="#4285F4" strokeWidth="1.5" /><rect x="7" y="12" width="3" height="3" rx="0.5" fill="#EA4335" /><rect x="13" y="12" width="3" height="3" rx="0.5" fill="#34A853" /></svg> },
                { name: "Apple Calendar", href: "https://www.icloud.com/calendar", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#FF3B30" strokeWidth="1.5" fill="none" /><path d="M3 9h18" stroke="#FF3B30" strokeWidth="1.5" /><text x="12" y="18" textAnchor="middle" fontSize="9" fontWeight="700" fill="#FF3B30">17</text></svg> },
                { name: "Outlook", href: "https://outlook.live.com", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#0078D4" strokeWidth="1.5" fill="none" /><path d="M3 9h18" stroke="#0078D4" strokeWidth="1.5" /><text x="12" y="18" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0078D4">OL</text></svg> },
                { name: "Google Drive", href: "https://drive.google.com", icon: <svg width="20" height="18" viewBox="0 0 22 20" fill="none"><path d="M7.5 0.5L0.5 12.5h6.5l7-12H7.5z" fill="#FBBC05" /><path d="M14 0.5L7 12.5l3.5 6.5H21l-7-12.5V0.5z" fill="#34A853" /><path d="M0.5 12.5l3.5 6.5h14l-3.5-6.5H0.5z" fill="#4285F4" /></svg> },
                { name: "OneDrive", href: "https://onedrive.live.com", icon: <svg width="22" height="14" viewBox="0 0 24 16" fill="none"><path d="M19.5 15.5H6c-3 0-5.5-2.5-5.5-5.5S3 4.5 6 4.5c.3 0 .6 0 .9.1C8.1 2 10.3.5 13 .5c3.3 0 6 2.5 6.3 5.7.1 0 .1 0 .2 0 2.5 0 4.5 2 4.5 4.5s-2 4.8-4.5 4.8z" fill="#0078D4" /></svg> },
                { name: "Notion", href: "https://www.notion.so", icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="2" stroke="#0A0909" strokeWidth="1.5" fill="none" /><text x="10" y="14.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0A0909">N</text></svg> },
                { name: "Google Docs", href: "https://docs.google.com", icon: <svg width="16" height="20" viewBox="0 0 18 22" fill="none"><path d="M11 1H3a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7l-6-6z" stroke="#4285F4" strokeWidth="1.5" fill="none" /><path d="M11 1v6h6" stroke="#4285F4" strokeWidth="1.5" fill="none" /><line x1="5" y1="12" x2="13" y2="12" stroke="#4285F4" strokeWidth="1" /><line x1="5" y1="15" x2="11" y2="15" stroke="#4285F4" strokeWidth="1" /></svg> },
              ].map((tool) => (
                <a key={tool.name} href={tool.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                  {tool.icon}
                  <span className="text-xs font-medium text-[#555] whitespace-nowrap">{tool.name}</span>
                </a>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-[rgba(0,0,0,0.06)] my-5" />

            {/* Research & courses */}
            <p className="text-[11px] font-semibold text-[#999] tracking-widest uppercase mb-4 text-center">Research & courses</p>
            <div className="flex flex-wrap justify-center gap-3">
              {/* YouTube */}
              <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[rgba(0,0,0,0.06)] text-xs font-semibold text-[#444] hover:border-[rgba(0,0,0,0.2)] hover:shadow-sm transition-all cursor-pointer">
                <svg width="18" height="13" viewBox="0 0 24 18" fill="none">
                  <rect x="0.5" y="0.5" width="23" height="17" rx="4" fill="#FF0000" />
                  <path d="M9.5 4.5v9l7-4.5-7-4.5z" fill="white" />
                </svg>
                YouTube
              </a>
              {/* Journal pills */}
              {[
                { name: "PubMed", href: "https://pubmed.ncbi.nlm.nih.gov" },
                { name: "JSTOR", href: "https://www.jstor.org" },
                { name: "arXiv", href: "https://arxiv.org" },
                { name: "Google Scholar", href: "https://scholar.google.com" },
                { name: "Nature", href: "https://www.nature.com" },
                { name: "Springer", href: "https://www.springer.com" },
                { name: "IEEE", href: "https://ieeexplore.ieee.org" },
                { name: "ScienceDirect", href: "https://www.sciencedirect.com" },
                { name: "ResearchGate", href: "https://www.researchgate.net" },
                { name: "SAGE", href: "https://journals.sagepub.com" },
                { name: "Wiley", href: "https://onlinelibrary.wiley.com" },
                { name: "Frontiers", href: "https://www.frontiersin.org" },
              ].map((j) => (
                <a key={j.name} href={j.href} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full bg-white border border-[rgba(0,0,0,0.06)] text-[11px] font-medium text-[#666] whitespace-nowrap hover:border-[rgba(0,0,0,0.2)] hover:text-[#333] hover:shadow-sm transition-all cursor-pointer">
                  {j.name}
                </a>
              ))}
              <div className="px-3 py-1.5 rounded-full bg-[#111] text-white text-[11px] font-semibold whitespace-nowrap">
                +19 databases
              </div>
            </div>
          </div>

          {/* Value props — lightweight inline */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mt-6 text-sm text-[#555]">
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#10b981" /><path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Search YouTube courses directly
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#10b981" /><path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              30+ journal databases, no login needed
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#10b981" /><path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Your entire learning powerhouse in one tab
            </span>
          </div>
        </div>
      </section>

      {/* ── Scrolling Questions ── */}
      <section className="py-6 bg-[#f8f9fa] overflow-hidden pause-on-hover">
        <div className="flex gap-4 animate-scroll-left">
          {[...questions, ...questions].map((q, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[280px] bg-white rounded-lg border border-[rgba(2,1,1,0.07)] p-4 text-sm text-[#666] min-h-[60px] flex items-center"
            >
              {q}
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#666] tracking-wide mb-3 uppercase">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Three steps to learning execution
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload your documents",
                desc: "Upload PDFs, notes, YouTube videos, or articles and Socraty instantly turns them into an organised, searchable library tied to your learning actions.",
                formats: ["PDF", "DOCX", "YouTube", "Articles"],
              },
              {
                step: "02",
                title: "Speak to your learning agent",
                desc: "Tell Agent Socraty what you are learning, what matters most, and how long you have got. You will then receive action items and a built learning plan around your unknowns.",
                formats: ["Web Links", "Text", "Notes"],
              },
              {
                step: "03",
                title: "Action items triage",
                desc: "Automatically sorted into Foundation, Solidification, and Mastery levels so you always work on the right thing at the right time.",
                formats: ["Books", "Slides", "Transcripts"],
              },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-white rounded-xl border border-[rgba(2,1,1,0.07)] p-8 hover:scale-[1.02] transition-transform"
              >
                <div className="text-3xl font-extrabold text-[#0A0909]/10 mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-[#666] text-sm leading-relaxed mb-4">
                  {item.desc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.formats.map((f) => (
                    <span
                      key={f}
                      className="text-xs font-medium bg-[#f8f9fa] text-[#666] px-3 py-1.5 rounded-full border border-[rgba(2,1,1,0.07)]"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interactive Preview Demo ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[#666] tracking-wide mb-3 uppercase">
              Try it yourself
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See it in action
            </h2>
            <p className="text-[#666] max-w-xl mx-auto">
              Search for any topic and see how Socraty turns it into a
              structured learning plan with daily action items.
            </p>
          </div>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-6">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={previewQuery}
                  onChange={(e) => setPreviewQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && previewQuery.trim())
                      handlePreviewGenerate();
                  }}
                  placeholder="Paste a YouTube link or search for a topic..."
                  className={`w-full px-5 py-3.5 rounded-full border border-[rgba(2,1,1,0.07)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10 ${previewLoading ? "animate-shimmer" : ""}`}
                />
              </div>
              <button
                onClick={() => handlePreviewGenerate()}
                disabled={previewLoading || !previewQuery.trim()}
                className="px-6 py-3.5 bg-[#0A0909] text-white text-sm font-semibold rounded-full hover:bg-[#0A0909]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {previewLoading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {previewChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handlePreviewGenerate(chip)}
                className="text-xs font-medium bg-white text-[#666] px-4 py-2 rounded-full border border-[rgba(2,1,1,0.07)] hover:border-[#0A0909]/20 hover:text-[#0A0909] transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Tier columns */}
          {previewActive && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Foundation */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <h3 className="font-bold text-sm uppercase tracking-wide text-emerald-700">
                    Foundation
                  </h3>
                  <span className="text-xs text-[#999] font-medium ml-auto">
                    {dummyActionItems.foundation.length} items
                  </span>
                </div>
                <div className="space-y-3">
                  {dummyActionItems.foundation.map((item, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border border-[rgba(2,1,1,0.07)] p-4 border-l-4 border-l-emerald-500 opacity-0"
                      style={{
                        animation: `fadeSlideIn 0.4s ease-out ${i * 0.15}s forwards`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-4 h-4 rounded border-2 border-emerald-300 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-[#0A0909] mb-1">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#666] leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Solidification */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <h3 className="font-bold text-sm uppercase tracking-wide text-amber-700">
                    Solidification
                  </h3>
                  <span className="text-xs text-[#999] font-medium ml-auto">
                    {dummyActionItems.solidification.length} items
                  </span>
                </div>
                <div className="space-y-3">
                  {dummyActionItems.solidification.map((item, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border border-[rgba(2,1,1,0.07)] p-4 border-l-4 border-l-amber-500 opacity-0"
                      style={{
                        animation: `fadeSlideIn 0.4s ease-out ${(i + 3) * 0.15}s forwards`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-4 h-4 rounded border-2 border-amber-300 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-[#0A0909] mb-1">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#666] leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mastery */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <h3 className="font-bold text-sm uppercase tracking-wide text-red-700">
                    Mastery
                  </h3>
                  <span className="text-xs text-[#999] font-medium ml-auto">
                    {dummyActionItems.mastery.length} items
                  </span>
                </div>
                <div className="space-y-3">
                  {dummyActionItems.mastery.map((item, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-xl border border-[rgba(2,1,1,0.07)] p-4 border-l-4 border-l-red-500 opacity-0"
                      style={{
                        animation: `fadeSlideIn 0.4s ease-out ${(i + 6) * 0.15}s forwards`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-4 h-4 rounded border-2 border-red-300 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm text-[#0A0909] mb-1">
                            {item.title}
                          </p>
                          <p className="text-xs text-[#666] leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* ── Product Previews ── */}
      <section className="py-20 md:py-28 bg-[#f8f9fa]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#666] tracking-wide mb-3 uppercase">
              Inside Socraty
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              See what you get
            </h2>
          </div>
          <div className="space-y-20">
            {[
              {
                title:
                  "Your daily brief tells you exactly what to learn today",
                desc: "Wake up to a personalised dashboard with today's focus, recommended resources based on your graded work, and a clear path forward.",
                label: "Home Dashboard",
                screenshot: "/preview-home.png",
              },
              {
                title: "Action items, sorted by difficulty based on your learning DNA",
                desc: "Every source you upload generates action items across Foundation, Solidification, and Mastery levels. Read the article, upload notes to get graded, or ask Socraty to explain.",
                label: "Action Items",
                screenshot: "/preview-actions.png",
              },
              {
                title: "Prove your understanding. Get graded.",
                desc: "Write notes in plain English. Socraty grades you out of 100, highlights your strengths, and surfaces the areas where your reasoning needs work.",
                label: "Graded Completion",
                screenshot: "/preview-mywork.png",
              },
              {
                title: "Your learning schedule, built automatically",
                desc: "Socraty schedules your tasks by difficulty across the week. One click to sync with Google Calendar. Auto Push fills your calendar intelligently.",
                label: "Calendar",
                screenshot: "/preview-calendar.png",
              },
              {
                title: "Speak to your personal learning agent",
                desc: "Ask anything about your uploaded content. Socraty explains, summarises, and quizzes you with Socratic probing. Chat history is saved across sessions.",
                label: "Ask Socraty",
                screenshot: "/preview-ask.png",
              },
              {
                title: "All your materials in one organised library",
                desc: "Upload YouTube videos, PDFs, or search journal articles. Socraty organises everything into smart folders and connects resources to your action items.",
                label: "Library",
                screenshot: "/preview-library.png",
              },
              {
                title: "Tell Socraty how you learn best",
                desc: "Set your learning style, goals, and preferences. Every response is personalised to you. Import your profile from ChatGPT, Claude, or Gemini in one click.",
                label: "Learner Profile",
                screenshot: "/preview-profile.png",
              },
            ].map((item, i) => (
              <div
                key={item.label}
                className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12`}
              >
                <div className="flex-1 max-w-[420px]">
                  <span className="text-xs font-semibold text-[#666] tracking-widest uppercase mb-3 block">
                    {item.label}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
                    {item.title}
                  </h3>
                  <p className="text-[#666] text-base leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="flex-1 w-full">
                  <div className="bg-white rounded-xl border border-[rgba(2,1,1,0.07)] p-1 shadow-sm">
                    <div className="h-5 bg-[#fafafa] rounded-t-lg border-b border-[rgba(2,1,1,0.05)] flex items-center px-3 gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                      <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                      <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                      <div className="flex-1 flex justify-center">
                        <div className="text-[9px] text-[#999] bg-white rounded px-6 py-0.5 border border-[rgba(2,1,1,0.05)]">
                          app.socraty.ai
                        </div>
                      </div>
                    </div>
                    <img
                      src={item.screenshot}
                      alt={item.label}
                      className="w-full rounded-b-lg"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Competitor Comparison Table ── */}
      <section id="comparison" className="py-20 md:py-28 bg-[#f8f9fa]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[#666] tracking-wide mb-3 uppercase">
              Compare
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              How Socraty compares
            </h2>
            <p className="text-[#666] text-base max-w-[520px] mx-auto">
              Most learning tools help you consume content. Socraty makes you
              prove you understand it.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[rgba(2,1,1,0.07)]">
            <table className="w-full text-sm border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[rgba(2,1,1,0.07)]">
                  <th className="text-left py-4 px-5 font-semibold text-[#666] bg-[#fafafa] sticky left-0 z-10 min-w-[200px]">
                    Feature
                  </th>
                  <th className="py-4 px-4 text-center bg-[#EFFBFF] font-bold text-[#0A0909] min-w-[100px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <img
                        src="/mascot.png"
                        alt=""
                        className="w-5 h-5 object-contain"
                      />
                      Socraty
                    </div>
                  </th>
                  <th className="py-4 px-4 text-center font-medium text-[#999] bg-[#fafafa] min-w-[90px]">
                    ChatGPT
                  </th>
                  <th className="py-4 px-4 text-center font-medium text-[#999] bg-[#fafafa] min-w-[100px]">
                    NotebookLM
                  </th>
                  <th className="py-4 px-4 text-center font-medium text-[#999] bg-[#fafafa] min-w-[80px]">
                    Anki
                  </th>
                  <th className="py-4 px-4 text-center font-medium text-[#999] bg-[#fafafa] min-w-[80px]">
                    Quizlet
                  </th>
                  <th className="py-4 px-4 text-center font-medium text-[#999] bg-[#fafafa] min-w-[90px]">
                    RemNote
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature:
                      "Upload any source (YouTube, PDF, articles)",
                    values: ["yes", "partial", "yes", "no", "no", "no"],
                  },
                  {
                    feature: "Daily learning action items",
                    values: ["yes", "no", "no", "no", "no", "no"],
                  },
                  {
                    feature: "Graded completion",
                    values: ["yes", "no", "no", "no", "no", "no"],
                  },
                  {
                    feature: "Auto-scheduled learning calendar",
                    values: ["yes", "no", "no", "no", "no", "no"],
                  },
                  {
                    feature:
                      "Difficulty tiers (Foundation → Mastery)",
                    values: ["yes", "no", "no", "no", "no", "no"],
                  },
                  {
                    feature: "Misconception detection",
                    values: ["yes", "no", "no", "no", "no", "no"],
                  },
                  {
                    feature: "Personalised learning agent",
                    values: ["yes", "partial", "yes", "no", "no", "no"],
                  },
                  {
                    feature:
                      "Journal article search (19+ databases)",
                    values: ["yes", "no", "no", "no", "no", "no"],
                  },
                  {
                    feature: "Socratic questioning",
                    values: ["yes", "no", "no", "no", "no", "no"],
                  },
                  {
                    feature: "Learner profile & adaptation",
                    values: ["yes", "no", "no", "no", "no", "no"],
                  },
                  {
                    feature: "Flashcards",
                    values: ["no", "no", "yes", "yes", "yes", "yes"],
                  },
                  {
                    feature: "Spaced repetition",
                    values: ["no", "no", "no", "yes", "yes", "yes"],
                  },
                ].map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-[rgba(2,1,1,0.04)] ${i % 2 === 0 ? "" : "bg-[#fafafa]/50"}`}
                  >
                    <td className="py-3.5 px-5 font-medium text-[#333] sticky left-0 z-10 bg-white">
                      {row.feature}
                    </td>
                    {row.values.map((val, j) => (
                      <td
                        key={j}
                        className={`py-3.5 px-4 text-center ${j === 0 ? "bg-[#EFFBFF]/50" : ""}`}
                      >
                        {val === "yes" ? (
                          <span className="text-emerald-500 text-base font-bold">
                            ✓
                          </span>
                        ) : val === "partial" ? (
                          <span className="text-amber-400 text-base font-bold">
                            ~
                          </span>
                        ) : (
                          <span className="text-[#ddd] text-base">✕</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center mt-6 text-sm text-[#999]">
            Socraty focuses on{" "}
            <span className="font-semibold text-[#333]">
              learning execution
            </span>
            . Others focus on content consumption.
          </p>
        </div>
      </section>

      {/* ── Book a Demo ── */}
      <section className="py-16 md:py-20">
        <div className="max-w-[800px] mx-auto px-6">
          <div className="rounded-2xl border border-[rgba(2,1,1,0.07)] bg-white p-10 md:p-14 text-center shadow-sm">
            <p className="text-xs font-semibold text-[#999] tracking-widest uppercase mb-3">
              For teams and organisations
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
              See Socraty in action for your team
            </h2>
            <p className="text-[#666] text-base max-w-[480px] mx-auto mb-8 leading-relaxed">
              Get a personalised walkthrough of how Socraty can transform your
              organisation's learning. Cut onboarding time, prove ROI, and
              track genuine comprehension.
            </p>
            <a
              href="/enterprise"
              className="inline-flex items-center gap-2 bg-[#0A0909] text-white font-semibold px-8 py-3.5 rounded-full text-sm hover:bg-[#333] transition"
            >
              Book a demo
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* ── Pricing / CTA ── */}
      <section id="pricing" ref={pricingRef} className="py-20 md:py-28 bg-[#EFFBFF]">
        <div className="max-w-[900px] mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Start learning, not planning
            </h2>
            <p className="text-[#666] text-base">
              7-day free trial. Cancel anytime.
            </p>
          </div>

          {/* Individual Plan */}
          <div className="max-w-md mx-auto">
            <div className="rounded-2xl bg-white border border-[rgba(2,1,1,0.07)] shadow-lg overflow-hidden">
              {/* Billing toggle */}
              <div className="px-6 pt-6 pb-2">
                <div className="flex items-center justify-center">
                  <div className="inline-flex items-center gap-1 bg-[#f8f9fa] rounded-full p-1">
                    <button
                      type="button"
                      onClick={() => setBillingPeriod("monthly")}
                      className={`px-5 py-2 rounded-full text-xs font-semibold transition-all ${
                        billingPeriod === "monthly"
                          ? "bg-[#0A0909] text-white shadow-sm"
                          : "text-[#666] hover:text-[#0A0909]"
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingPeriod("annual")}
                      className={`px-5 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        billingPeriod === "annual"
                          ? "bg-[#0A0909] text-white shadow-sm"
                          : "text-[#666] hover:text-[#0A0909]"
                      }`}
                    >
                      Annual
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                        Save 28%
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="text-center py-6">
                {billingPeriod === "monthly" ? (
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-extrabold">£15</span>
                    <span className="text-[#666] text-sm">/month</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-2xl font-bold text-[#999] line-through decoration-red-400/60 decoration-2">
                        £180
                      </span>
                      <span className="text-5xl font-extrabold">£129</span>
                      <span className="text-[#666] text-sm">/year</span>
                    </div>
                    <p className="text-[#666] text-sm mt-2 font-medium">
                      £10.75/month, billed annually
                    </p>
                    <div className="inline-flex items-center gap-1.5 mt-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                      <span>Save £51</span>
                      <span className="text-emerald-500">·</span>
                      <span>That&apos;s over 3 months free</span>
                    </div>
                  </>
                )}
              </div>

              <div className="px-6 pb-6 space-y-4">
                {/* Feature list */}
                <ul className="space-y-3 text-sm">
                  {[
                    "Unlimited source uploads (YouTube, PDF, articles)",
                    "Personalised action items with grading",
                    "Auto-scheduled calendar + Google Calendar sync",
                    "Ask Socraty, your personal learning agent",
                    "Learner profile + LLM import",
                    "Journal article search",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="text-emerald-500 text-sm">✓</span>
                      <span className="text-[#333]">{item}</span>
                    </li>
                  ))}
                </ul>

                {/* Google Sign-In */}
                <a
                  href="/api/auth/google"
                  className="flex items-center justify-center gap-3 w-full py-3 rounded-full border border-[rgba(2,1,1,0.12)] bg-white text-sm font-medium hover:bg-[#f8f9fa] transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Start Free Trial with Google
                </a>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[rgba(2,1,1,0.07)]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-[#999]">or</span>
                  </div>
                </div>

                <form onSubmit={handleSubscribe} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-5 py-3 rounded-full border border-[rgba(2,1,1,0.12)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10 focus:border-[#0A0909]/30 transition-all placeholder:text-[#999]"
                  />
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-3 rounded-full bg-[#0A0909] text-white font-semibold text-sm hover:bg-[#333] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Redirecting...
                      </span>
                    ) : (
                      "Start Free Trial with Email"
                    )}
                  </button>
                </form>

                <p className="text-xs text-[#999] text-center">
                  No spam, unsubscribe at any time. We respect your privacy.
                </p>
              </div>
            </div>

            <p className="text-center mt-5 text-sm text-[#666]">
              Already a subscriber?{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-[#0A0909] font-semibold hover:underline"
              >
                Restore access
              </button>
            </p>

            <div className="mt-8 pt-6 border-t border-[rgba(0,0,0,0.06)]">
              <p className="text-center text-sm font-medium text-[#555] mb-3">Have a promo code?</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!promoCode.trim() || !promoEmail.trim()) return;
                  setPromoLoading(true);
                  setPromoError("");
                  try {
                    const res = await fetch("/api/promo/redeem", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: promoCode.trim(), email: promoEmail.trim(), password: promoPassword || undefined }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setPromoError(data.error || "Something went wrong");
                    } else {
                      router.push("/app");
                    }
                  } catch {
                    setPromoError("Something went wrong");
                  }
                  setPromoLoading(false);
                }}
                className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
              >
                <input
                  type="text"
                  placeholder="Promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 rounded-full px-4 py-2.5 border border-[rgba(2,1,1,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10"
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={promoEmail}
                  onChange={(e) => setPromoEmail(e.target.value)}
                  className="flex-1 rounded-full px-4 py-2.5 border border-[rgba(2,1,1,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10"
                />
                <input
                  type="password"
                  placeholder="Create password"
                  value={promoPassword}
                  onChange={(e) => setPromoPassword(e.target.value)}
                  className="flex-1 rounded-full px-4 py-2.5 border border-[rgba(2,1,1,0.12)] text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10"
                />
                <button
                  type="submit"
                  disabled={promoLoading || !promoCode.trim() || !promoEmail.trim()}
                  className="rounded-full px-5 py-2.5 bg-[#0A0909] text-white text-sm font-semibold hover:bg-[#222] transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {promoLoading ? "Activating..." : "Activate"}
                </button>
              </form>
              {promoCode.trim() && (
                <div className="flex items-center gap-2 max-w-md mx-auto">
                  <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
                  <span className="text-xs text-[#999]">or</span>
                  <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
                </div>
              )}
              {promoCode.trim() && (
                <div className="flex justify-center">
                  <a
                    href={`/api/auth/google?promo=${encodeURIComponent(promoCode.trim())}`}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border border-[rgba(2,1,1,0.12)] text-sm font-medium hover:bg-[#f5f5f5] transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign in with Google
                  </a>
                </div>
              )}
              {promoError && (
                <p className="text-center text-xs text-red-600 mt-2">{promoError}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer>
        {/* Links section */}
        <div className="bg-[#fafafa] border-t border-[rgba(2,1,1,0.07)]">
          <div className="max-w-[1200px] mx-auto px-6 py-14">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              <div>
                <h4 className="font-bold text-base mb-3">Legal</h4>
                <div className="w-full h-px bg-[rgba(0,0,0,0.1)] mb-4" />
                <ul className="space-y-3 text-sm text-[#444]">
                  <li><a href="/privacy" className="hover:text-[#0A0909] transition">Privacy Policy</a></li>
                  <li><a href="/terms" className="hover:text-[#0A0909] transition">Terms of Use</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-base mb-3">Support</h4>
                <div className="w-full h-px bg-[rgba(0,0,0,0.1)] mb-4" />
                <ul className="space-y-3 text-sm text-[#444]">
                  <li><a href="/enterprise" className="hover:text-[#0A0909] transition">Get a Demo</a></li>
                  <li><a href="/company" className="hover:text-[#0A0909] transition">Company</a></li>
                  <li><a href="/contact" className="hover:text-[#0A0909] transition">Contact Us</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-base mb-3">Careers</h4>
                <div className="w-full h-px bg-[rgba(0,0,0,0.1)] mb-4" />
                <ul className="space-y-3 text-sm text-[#444]">
                  <li><a href="/careers" className="hover:text-[#0A0909] transition">Join the Team</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="bg-[#0A0909]">
          <div className="max-w-[1200px] mx-auto px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Socraty" className="h-6 object-contain brightness-0 invert" />
              <span className="text-sm text-[#999]">© Socraty 2025. All rights reserved</span>
            </div>
            <a
              href="https://www.linkedin.com/company/socratyai/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-lg bg-[#222] flex items-center justify-center hover:bg-[#333] transition"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
