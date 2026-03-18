"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EnterprisePage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-white text-[#0A0909]"
      style={{ fontFamily: "var(--font-figtree), sans-serif" }}
    >
      {/* Navigation */}
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
            <a href="/#how-it-works" className="hover:text-[#0A0909] transition">
              How it works
            </a>
            <a href="/#how-it-works" className="hover:text-[#0A0909] transition">
              Features
            </a>
            <a href="/#comparison" className="hover:text-[#0A0909] transition">
              Compare
            </a>
            <a
              href="/enterprise"
              className="text-[#0A0909] font-semibold"
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
              href="/#pricing"
              className="bg-[#0A0909] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#333] transition"
            >
              Get Started Free
            </a>
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
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[rgba(2,1,1,0.07)] bg-white px-6 py-4 space-y-3">
            <a href="/#how-it-works" className="block text-sm text-[#666] hover:text-[#0A0909] transition">How it works</a>
            <a href="/#how-it-works" className="block text-sm text-[#666] hover:text-[#0A0909] transition">Features</a>
            <a href="/#comparison" className="block text-sm text-[#666] hover:text-[#0A0909] transition">Compare</a>
            <a href="/enterprise" className="block text-sm text-[#666] hover:text-[#0A0909] transition">Enterprise</a>
            <div className="border-t border-[rgba(2,1,1,0.07)] pt-3 flex flex-col gap-2">
              <a href="/login" className="text-sm text-[#666] hover:text-[#0A0909] transition">Sign in</a>
              <a href="/#pricing" className="bg-[#0A0909] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#333] transition text-center">Get Started Free</a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-28">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase text-[#999] mb-3">
              For organisations
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6">
              Your L&D budget is burning
            </h1>
            <p className="text-[#666] max-w-2xl mx-auto text-lg leading-relaxed">
              Companies spend $400 billion on training globally. Only 10%
              delivers real results. The problem is not content. It is
              execution.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
            {[
              { stat: "20-30%", label: "Average course completion rate" },
              { stat: "24 min", label: "All employees have per week to learn" },
              { stat: "88%", label: "Of learners never apply what they learned" },
              { stat: "13%", label: "Of companies can measure L&D ROI" },
            ].map((s) => (
              <div
                key={s.stat}
                className="bg-[#f8f9fa] border border-[rgba(2,1,1,0.07)] rounded-xl p-6 text-center"
              >
                <div className="text-3xl md:text-4xl font-extrabold text-[#0A0909] mb-2">
                  {s.stat}
                </div>
                <p className="text-[#666] text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20 md:py-28 bg-[#f8f9fa]">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              From content access to learning execution
            </h2>
            <p className="text-[#666] max-w-2xl mx-auto text-base leading-relaxed">
              Socraty turns your existing training materials into daily
              micro-actions that employees actually complete, understand, and
              apply. Track genuine comprehension, not just course completions.
            </p>
          </div>

          {/* 6 benefit cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">
            {[
              {
                title: "Cut onboarding time in half",
                desc: "New hires get structured action items from day one, not a 40-hour course catalogue to wade through.",
              },
              {
                title: "Prove ROI to leadership",
                desc: "Comprehension scores and completion data your CFO can actually use to justify L&D spend.",
              },
              {
                title: "Fits in 24 minutes",
                desc: "Micro-actions designed for real workdays. No pulling people out of work for half-day training sessions.",
              },
              {
                title: "Kill the shelfware problem",
                desc: "Stop paying for content libraries nobody opens. Socraty turns existing materials into structured learning paths.",
              },
              {
                title: "Track understanding, not logins",
                desc: "Employees explain back what they learned. Socraty grades their comprehension so you know what stuck.",
              },
              {
                title: "Close the skills gap faster",
                desc: "44% of workers need reskilling by 2030. Structured execution means skills are built, not just assigned.",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="flex items-start gap-3 bg-white border border-[rgba(2,1,1,0.07)] rounded-xl p-5"
              >
                <svg
                  className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-[#0A0909] mb-1">{b.title}</p>
                  <p className="text-[#666] text-sm leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features list + Contact form */}
      <section className="py-20 md:py-28">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Socraty for Teams & Enterprise
            </h2>
            <p className="text-[#666] text-base max-w-[520px] mx-auto">
              A learning execution layer for your organisation. Track genuine
              understanding, not just course completions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Feature list */}
            <div>
              <ul className="space-y-3.5 text-sm">
                {[
                  "Structured upskilling for employees across departments",
                  "Graded onboarding paths for new hires from your own materials",
                  "Upload company training (SOPs, manuals, product docs) and auto-generate learning actions",
                  "Learning execution layer for existing company courses",
                  "Track genuine understanding, not just course completions",
                  "Personalised learning profiles that adapt to each employee",
                  "Team progress analytics and comprehension reporting",
                  "Bulk content ingestion for entire training libraries",
                  "Dedicated account manager and priority support",
                  "Custom integrations and SSO (coming soon)",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[#333]"
                  >
                    <span className="mt-0.5 text-emerald-500 flex-shrink-0">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact form */}
            <div>
              <p className="text-[#999] text-xs font-semibold uppercase tracking-widest mb-4">
                Get a custom quote
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  const subject = encodeURIComponent(
                    `Enterprise inquiry from ${data.get("company")}`
                  );
                  const body = encodeURIComponent(
                    `Company: ${data.get("company")}\nWork email: ${data.get("workEmail")}\nTeam size: ${data.get("teamSize")}\nAvailability: ${data.get("availability")}`
                  );
                  window.location.href = `mailto:socratyai@gmail.com?subject=${subject}&body=${body}`;
                }}
                className="space-y-3"
              >
                <input
                  name="company"
                  type="text"
                  placeholder="Company name"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-[#f8f9fa] border border-[rgba(2,1,1,0.07)] text-sm text-[#0A0909] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10 transition-all"
                />
                <input
                  name="workEmail"
                  type="email"
                  placeholder="Work email"
                  required
                  className="w-full px-4 py-3 rounded-lg bg-[#f8f9fa] border border-[rgba(2,1,1,0.07)] text-sm text-[#0A0909] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10 transition-all"
                />
                <select
                  name="teamSize"
                  required
                  defaultValue=""
                  className="w-full px-4 py-3 rounded-lg bg-[#f8f9fa] border border-[rgba(2,1,1,0.07)] text-sm text-[#666] focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10 transition-all appearance-none"
                >
                  <option value="" disabled>
                    Team size
                  </option>
                  <option value="10-50">10 - 50 employees</option>
                  <option value="50-200">50 - 200 employees</option>
                  <option value="200-500">200 - 500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
                <textarea
                  name="availability"
                  placeholder="Your availability for a call (e.g. weekday mornings GMT)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-[#f8f9fa] border border-[rgba(2,1,1,0.07)] text-sm text-[#0A0909] placeholder:text-[#999] focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10 transition-all resize-none"
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-[#0A0909] text-white font-semibold text-sm hover:bg-[#333] transition-all"
                >
                  Get a Custom Quote
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(2,1,1,0.07)] bg-white">
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            <div className="md:col-span-2">
              <img
                src="/logo.png"
                alt="Socraty"
                className="h-7 mb-4 object-contain"
              />
              <p className="text-sm text-[#666] leading-relaxed max-w-[360px]">
                Your personal learning agent. Upload materials, ask questions,
                and learn with Socratic questioning. For learners aged 16+.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-[#666]">
                <li>
                  <a href="/#how-it-works" className="hover:text-[#0A0909] transition">
                    Features
                  </a>
                </li>
                <li>
                  <a href="/#how-it-works" className="hover:text-[#0A0909] transition">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="/#pricing" className="hover:text-[#0A0909] transition">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-[#666]">
                <li>
                  <a href="/enterprise" className="hover:text-[#0A0909] transition">
                    Enterprise
                  </a>
                </li>
                <li>
                  <a href="/testimonials" className="hover:text-[#0A0909] transition">
                    Testimonials
                  </a>
                </li>
                <li>
                  <a href="/contact" className="hover:text-[#0A0909] transition">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[rgba(2,1,1,0.07)] mt-10 pt-6 text-center text-xs text-[#999]">
            © 2025 Socraty. All rights reserved. Empowering learners through
            guided education.
          </div>
        </div>
      </footer>
    </div>
  );
}
