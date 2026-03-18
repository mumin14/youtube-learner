"use client";

import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General Enquiry");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

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

      <main className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#0A0909] mb-3">Contact Us</h1>
          <p className="text-[#666] text-lg">We&apos;d love to hear from you</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          <div className="md:col-span-2">
            {submitted ? (
              <div className="bg-white rounded-2xl border border-[rgba(2,1,1,0.07)] p-10 text-center">
                <div className="text-3xl mb-4">&#10003;</div>
                <h2 className="text-xl font-semibold text-[#0A0909] mb-2">Message sent</h2>
                <p className="text-[#666] text-sm">
                  Thanks for reaching out. We&apos;ll get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl border border-[rgba(2,1,1,0.07)] p-8 space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-[#0A0909] mb-1.5">Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[rgba(2,1,1,0.1)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A0909] mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[rgba(2,1,1,0.1)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A0909] mb-1.5">Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[rgba(2,1,1,0.1)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10"
                  >
                    <option>General Enquiry</option>
                    <option>Support</option>
                    <option>Enterprise</option>
                    <option>Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0A0909] mb-1.5">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[rgba(2,1,1,0.1)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0A0909]/10 resize-none"
                    placeholder="How can we help?"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#0A0909] text-white font-medium text-sm hover:bg-[#222] transition"
                >
                  Send Message
                </button>
              </form>
            )}
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-[rgba(2,1,1,0.07)] p-6">
              <h3 className="text-sm font-semibold text-[#0A0909] mb-3">Email</h3>
              <a
                href="mailto:hello@socraty.ai"
                className="text-sm text-[#666] hover:text-[#0A0909] transition"
              >
                hello@socraty.ai
              </a>
            </div>

            <div className="bg-white rounded-2xl border border-[rgba(2,1,1,0.07)] p-6">
              <h3 className="text-sm font-semibold text-[#0A0909] mb-3">LinkedIn</h3>
              <a
                href="https://www.linkedin.com/company/socratyai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#666] hover:text-[#0A0909] transition"
              >
                linkedin.com/company/socratyai
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
