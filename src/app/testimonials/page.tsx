"use client";

import { useRouter } from "next/navigation";

const testimonials = [
  {
    before:
      "I keep rebuilding the perfect learning plan every week, then abandon it by Wednesday and feel like a failure.",
    after:
      "Now I wake up to 3 clear actions for today and do not waste time deciding what to learn.",
  },
  {
    before:
      "I reread slides and highlight everything, but when tested I realise nothing sticks.",
    after: "Socraty organised my learning so I did not have to.",
  },
  {
    before:
      "I am drowning in PDFs and lecture recordings and have no idea what to prioritise.",
    after:
      "My materials are turned into ordered tasks, so I always know the next right step.",
  },
  {
    before:
      "I thought I understood the material... then my mind went blank when I needed it most.",
    after:
      "The action item list actually checks if you did the work.",
  },
];

export default function TestimonialsPage() {
  const router = useRouter();

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
            <a href="/enterprise" className="hover:text-[#0A0909] transition">
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
          </div>
        </div>
      </nav>

      {/* Testimonials */}
      <section className="py-20 md:py-28">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-[#666] tracking-wide mb-3 uppercase">
              Real stories
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-[700px] mx-auto mb-4">
              What learners say
            </h1>
            <div className="flex items-center justify-center gap-1 mt-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <span key={s} className="text-amber-400 text-lg">
                  ★
                </span>
              ))}
              <span className="text-sm text-[#666] ml-2 font-medium">
                4.9/5
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-[900px] mx-auto">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-[rgba(2,1,1,0.07)] p-8"
              >
                <div className="mb-4">
                  <p className="text-sm text-[#999] italic leading-relaxed line-through decoration-[#ddd]">
                    &ldquo;{t.before}&rdquo;
                  </p>
                </div>
                <div className="border-t border-[rgba(2,1,1,0.07)] pt-4">
                  <p className="text-sm text-[#333] font-medium leading-relaxed">
                    &ldquo;{t.after}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#EFFBFF]">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold mb-4">
            Ready to start learning with execution?
          </h2>
          <a
            href="/#pricing"
            className="inline-block bg-[#0A0909] text-white font-semibold px-8 py-3.5 rounded-full text-sm hover:bg-[#333] transition"
          >
            Start your free trial
          </a>
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
