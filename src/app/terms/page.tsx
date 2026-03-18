"use client";

import { useState } from "react";

export default function TermsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[#0A0909]" style={{ fontFamily: "var(--font-figtree), sans-serif" }}>
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
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Terms of Use</h1>
        <p className="text-sm text-[#999] mb-10">Last updated: March 2025</p>

        <h2 className="text-xl font-semibold mt-10 mb-4">1. Acceptance of Terms</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          By accessing or using the Socraty platform, website, and any associated services (collectively, the &quot;Service&quot;), you agree to be bound by these Terms of Use (&quot;Terms&quot;). If you do not agree to these Terms, you must not access or use the Service.
        </p>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          These Terms constitute a legally binding agreement between you and Socraty. Please read them carefully before using the Service. Your continued use of the Service following any changes to these Terms constitutes your acceptance of those changes.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">2. Description of Service</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Socraty is a learning execution platform that helps learners process materials, generate action items, and learn effectively. The Service may include, but is not limited to:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li>Processing and summarising learning materials, including video and text content.</li>
          <li>Generating structured action items and learning plans.</li>
          <li>Providing tools to track progress and reinforce understanding.</li>
          <li>Facilitating interactive learning experiences.</li>
        </ul>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Socraty reserves the right to modify, suspend, or discontinue any part of the Service at any time, with or without notice.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">3. Account Registration</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          To access certain features of the Service, you may be required to create an account. When registering, you agree to:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li>Provide accurate, current, and complete information during registration.</li>
          <li>Maintain and promptly update your account information to keep it accurate and complete.</li>
          <li>Maintain the security and confidentiality of your login credentials.</li>
          <li>Accept responsibility for all activities that occur under your account.</li>
          <li>Register for and maintain only one account per person.</li>
        </ul>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          You must notify Socraty immediately if you become aware of any unauthorised use of your account. Socraty shall not be liable for any loss arising from unauthorised use of your account where you have failed to maintain the security of your credentials.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">4. Acceptable Use</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li>Upload, share, or transmit any content that is unlawful, harmful, threatening, abusive, defamatory, obscene, or otherwise objectionable.</li>
          <li>Use the Service to infringe upon the intellectual property rights of any third party.</li>
          <li>Attempt to reverse engineer, decompile, disassemble, or otherwise derive the source code of the Service or any part thereof.</li>
          <li>Use any automated means, including bots, scrapers, or crawlers, to access the Service without prior written consent from Socraty.</li>
          <li>Share your account credentials with any other person or allow multiple individuals to use a single account.</li>
          <li>Interfere with or disrupt the integrity or performance of the Service or its underlying infrastructure.</li>
          <li>Attempt to gain unauthorised access to any part of the Service, other accounts, or any systems or networks connected to the Service.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">5. Your Content</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          You retain ownership of all content, materials, and data that you upload, submit, or otherwise make available through the Service (&quot;Your Content&quot;). By uploading Your Content, you grant Socraty a non-exclusive, worldwide, royalty-free licence to use, process, store, and display Your Content solely for the purpose of providing and improving the Service.
        </p>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          You represent and warrant that:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li>You own or have the necessary rights, licences, and permissions to upload and use Your Content.</li>
          <li>Your Content does not infringe upon the intellectual property rights, privacy rights, or any other rights of any third party.</li>
          <li>Your Content complies with all applicable laws and regulations.</li>
        </ul>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Socraty is not responsible for any content uploaded by users and does not endorse any opinions or views expressed in user-submitted content.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">6. Intellectual Property</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          The Service, including its design, features, functionality, branding, logos, trademarks, and all associated intellectual property, is and shall remain the exclusive property of Socraty and its licensors. Nothing in these Terms grants you any right, title, or interest in the Service beyond the limited right to use it in accordance with these Terms.
        </p>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          The structure, organisation, and presentation of generated content (including summaries, action items, and learning plans) are the intellectual property of Socraty. You may use such generated content for your personal learning purposes but may not reproduce, distribute, or commercialise it without prior written consent.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">7. Payment and Subscription</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Certain features of the Service require a paid subscription. By subscribing, you agree to the following:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li><strong>Recurring billing.</strong> Subscription fees are billed on a recurring basis (monthly or annually, as selected) via Stripe. You authorise Socraty to charge your chosen payment method at the start of each billing cycle.</li>
          <li><strong>Free trials.</strong> If a free trial is offered, you will not be charged until the trial period ends. If you do not cancel before the trial expires, your subscription will automatically convert to a paid plan.</li>
          <li><strong>Cancellation.</strong> You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period, and you will retain access until that date.</li>
          <li><strong>Refunds.</strong> Subscription fees are generally non-refundable. However, if you believe you are entitled to a refund due to a billing error or service issue, please contact us and we will review your request in accordance with applicable consumer protection laws.</li>
          <li><strong>Price changes.</strong> Socraty reserves the right to change subscription pricing. You will be given at least 30 days&apos; notice of any price increase, and the new price will apply from the start of your next billing cycle following the notice period.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">8. Limitation of Liability</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          To the fullest extent permitted by applicable law:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li>The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis, without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</li>
          <li>Socraty does not guarantee any specific learning outcomes, results, or improvements from use of the Service.</li>
          <li>Socraty shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or in connection with your use of the Service.</li>
          <li>Socraty&apos;s total aggregate liability to you for any claims arising from or relating to these Terms or the Service shall not exceed the total amount of subscription fees paid by you to Socraty in the twelve (12) months immediately preceding the event giving rise to the claim.</li>
        </ul>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Nothing in these Terms excludes or limits liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded or limited under the laws of England and Wales.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">9. Indemnification</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          You agree to indemnify, defend, and hold harmless Socraty, its directors, officers, employees, agents, and affiliates from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li>Your use of the Service.</li>
          <li>Your Content or any materials you upload to the Service.</li>
          <li>Your breach of these Terms.</li>
          <li>Your violation of any applicable law or regulation.</li>
          <li>Your infringement of any third-party rights.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">10. Termination</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Either party may terminate these Terms at any time. Socraty may suspend or terminate your access to the Service immediately, without prior notice, if you breach any provision of these Terms or if Socraty is required to do so by law.
        </p>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          You may terminate your account at any time by contacting Socraty or through your account settings. Upon termination:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li>Your right to access and use the Service will cease immediately.</li>
          <li>Socraty may, at its discretion, delete Your Content and any associated data within a reasonable period following termination.</li>
          <li>You may request a copy of Your Content prior to termination. Socraty will endeavour to provide this within a reasonable timeframe, subject to technical feasibility.</li>
          <li>Provisions of these Terms that by their nature should survive termination (including, without limitation, intellectual property, limitation of liability, and indemnification) shall continue in full force and effect.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-10 mb-4">11. Governing Law</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
        </p>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          If you are a consumer, you will benefit from any mandatory provisions of the law of the country in which you are resident. Nothing in these Terms affects your rights as a consumer to rely on such mandatory provisions of local law.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">12. Changes to Terms</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Socraty reserves the right to update or modify these Terms at any time. We will provide at least 30 days&apos; notice of any material changes by posting the updated Terms on the Service and, where practicable, by notifying you via email.
        </p>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised Terms. If you do not agree to the updated Terms, you must stop using the Service and close your account.
        </p>

        <h2 className="text-xl font-semibold mt-10 mb-4">13. Contact</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          If you have any questions or concerns about these Terms, please contact us at:
        </p>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          <a href="mailto:legal@socraty.ai" className="text-[#0A0909] underline hover:no-underline">legal@socraty.ai</a>
        </p>
      </main>
    </div>
  );
}
