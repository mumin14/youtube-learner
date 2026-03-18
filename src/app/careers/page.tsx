"use client";

import { useState } from "react";

const values = [
  {
    title: "Ownership",
    description:
      "We trust each other to take full responsibility for our work. You will not be micromanaged. You will be supported.",
  },
  {
    title: "Curiosity",
    description:
      "We are building a learning company, so we practise what we preach. Ask questions, challenge assumptions, and keep learning.",
  },
  {
    title: "Impact over Output",
    description:
      "We care about what moves the needle, not how many hours you logged. Outcomes matter more than activity.",
  },
  {
    title: "Transparency",
    description:
      "We share context openly so everyone can make good decisions. No information hoarding, no politics.",
  },
];

export default function CareersPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[rgba(2,1,1,0.07)]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Socraty" className="h-8 object-contain" />
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#666]">
            <a href="/#how-it-works" className="hover:text-[#0A0909] transition">How it works</a>
            <a href="/#how-it-works" className="hover:text-[#0A0909] transition">Features</a>
            <a href="/#comparison" className="hover:text-[#0A0909] transition">Compare</a>
            <a href="/enterprise" className="hover:text-[#0A0909] transition">Enterprise</a>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="text-sm text-[#666] hover:text-[#0A0909] transition hidden sm:block">Sign in</a>
            <a href="/#pricing" className="bg-[#0A0909] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#333] transition">Get Started Free</a>
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

      <main className="max-w-[800px] mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#0A0909] mb-3">Join the Team</h1>
          <p className="text-[#666] text-lg">Help us reimagine how the world learns</p>
        </div>

        <section className="mb-16">
          <p className="text-[#444] text-base leading-relaxed">
            Socraty is a small, focused team building tools that help people learn more effectively.
            We work remotely, move fast, and care deeply about the problem we are solving. If you
            are passionate about education and want to do meaningful work, we would love to hear
            from you.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0A0909] mb-6">What We Value</h2>
          <div className="space-y-6">
            {values.map((value) => (
              <div key={value.title}>
                <h3 className="text-base font-semibold text-[#0A0909] mb-1">{value.title}</h3>
                <p className="text-sm text-[#666] leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-[rgba(2,1,1,0.07)] p-8 text-center">
          <h2 className="text-2xl font-semibold text-[#0A0909] mb-3">Open Positions</h2>
          <p className="text-[#666] text-sm mb-6">
            No open positions right now. Check back soon or send us your CV.
          </p>
          <a
            href="/contact"
            className="inline-block px-6 py-3 rounded-xl bg-[#0A0909] text-white font-medium text-sm hover:bg-[#222] transition"
          >
            Send Your CV
          </a>
        </section>
      </main>
    </div>
  );
}
