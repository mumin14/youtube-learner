export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-[#0A0909]" style={{ fontFamily: "var(--font-figtree), sans-serif" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[rgba(2,1,1,0.07)]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Socraty" className="h-8 object-contain" />
          </a>
          <a href="/" className="text-sm text-[#666] hover:text-[#0A0909] transition">Back to home</a>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-[#999] mb-10">Last updated: March 2025</p>

        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Socraty is committed to protecting your privacy and ensuring your personal data is handled responsibly. This Privacy Policy explains how we collect, use, store and share your information when you use our platform. By using Socraty, you agree to the practices described in this policy.
        </p>

        {/* 1. Information We Collect */}
        <h2 className="text-xl font-semibold mt-10 mb-4">1. Information We Collect</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          We collect the following categories of personal data when you use Socraty:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li><strong>Account information:</strong> your name, email address and Google account details when you sign up or log in.</li>
          <li><strong>Learning materials:</strong> content you upload to the platform, including videos, documents and other resources.</li>
          <li><strong>Usage data:</strong> information about how you interact with the platform, such as pages visited, features used, timestamps and device information.</li>
          <li><strong>Payment information:</strong> billing details processed securely through our payment provider. We do not store your full card details.</li>
        </ul>

        {/* 2. How We Use Your Information */}
        <h2 className="text-xl font-semibold mt-10 mb-4">2. How We Use Your Information</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          We use the information we collect for the following purposes:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li>To provide, maintain and operate the Socraty platform.</li>
          <li>To personalise your learning experience and deliver relevant content.</li>
          <li>To improve and develop new features for the platform.</li>
          <li>To communicate with you about your account, updates and support queries.</li>
          <li>To process payments and manage your subscription.</li>
          <li>To ensure the security and integrity of our service.</li>
        </ul>

        {/* 3. Legal Basis for Processing */}
        <h2 className="text-xl font-semibold mt-10 mb-4">3. Legal Basis for Processing</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Under Article 6 of the UK General Data Protection Regulation (UK GDPR), we process your personal data on the following legal bases:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li><strong>Consent:</strong> where you have given clear consent for us to process your personal data for a specific purpose.</li>
          <li><strong>Contract performance:</strong> where processing is necessary to fulfil our contract with you, for example to provide the Socraty service after you create an account.</li>
          <li><strong>Legitimate interests:</strong> where processing is necessary for our legitimate interests, such as improving the platform and ensuring its security, provided these interests do not override your rights.</li>
        </ul>

        {/* 4. Data Retention */}
        <h2 className="text-xl font-semibold mt-10 mb-4">4. Data Retention</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          We retain your personal data for as long as your account remains active and as needed to provide you with our services. When you delete your account, we will delete or anonymise your personal data within 30 days, unless we are required to retain certain information for legal or regulatory purposes.
        </p>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          You have the right to request deletion of your data at any time by contacting us at privacy@socraty.ai.
        </p>

        {/* 5. Your Rights Under UK GDPR */}
        <h2 className="text-xl font-semibold mt-10 mb-4">5. Your Rights Under UK GDPR</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Under the UK GDPR, you have the following rights in relation to your personal data:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li><strong>Right of access:</strong> you can request a copy of the personal data we hold about you.</li>
          <li><strong>Right to rectification:</strong> you can ask us to correct any inaccurate or incomplete data.</li>
          <li><strong>Right to erasure:</strong> you can request that we delete your personal data in certain circumstances.</li>
          <li><strong>Right to data portability:</strong> you can request a copy of your data in a structured, commonly used and machine-readable format.</li>
          <li><strong>Right to restrict processing:</strong> you can ask us to limit how we use your data in certain circumstances.</li>
          <li><strong>Right to object:</strong> you can object to the processing of your personal data where we rely on legitimate interests.</li>
          <li><strong>Right to withdraw consent:</strong> where processing is based on consent, you can withdraw that consent at any time.</li>
        </ul>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          To exercise any of these rights, please contact us at privacy@socraty.ai. We will respond to your request within one month.
        </p>

        {/* 6. Cookies and Tracking */}
        <h2 className="text-xl font-semibold mt-10 mb-4">6. Cookies and Tracking</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Socraty uses essential session cookies to keep you authenticated and to ensure the platform functions correctly. These cookies are strictly necessary for the operation of the service.
        </p>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          We do not use third-party tracking cookies or share your browsing data with advertisers. We may use basic analytics to understand how learners use the platform, but this data is collected in an anonymised or aggregated form.
        </p>

        {/* 7. Third-Party Services */}
        <h2 className="text-xl font-semibold mt-10 mb-4">7. Third-Party Services</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          We work with a limited number of trusted third-party service providers to operate the platform:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li><strong>Stripe:</strong> processes payments securely on our behalf. Stripe handles your payment information in accordance with their own privacy policy.</li>
          <li><strong>Google:</strong> provides authentication services so you can sign in with your Google account.</li>
        </ul>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          We only share personal data with these processors to the extent necessary to provide our services. Each provider is contractually obligated to protect your data in accordance with applicable data protection laws.
        </p>

        {/* 8. Data Security */}
        <h2 className="text-xl font-semibold mt-10 mb-4">8. Data Security</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          We take the security of your personal data seriously and implement appropriate technical and organisational measures to protect it. These measures include:
        </p>
        <ul className="list-disc pl-5 text-sm text-[#555] leading-relaxed space-y-2 mb-4">
          <li>Encryption of data in transit using TLS/SSL.</li>
          <li>Secure storage of data at rest with encryption.</li>
          <li>Password hashing using industry-standard algorithms.</li>
          <li>Regular security reviews and updates to our infrastructure.</li>
        </ul>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          While we strive to protect your personal data, no method of transmission over the internet is completely secure. We encourage you to use strong passwords and keep your account credentials safe.
        </p>

        {/* 9. International Data Transfers */}
        <h2 className="text-xl font-semibold mt-10 mb-4">9. International Data Transfers</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Your data may be processed on servers located outside the United Kingdom. Where this occurs, we ensure that appropriate safeguards are in place to protect your personal data, including standard contractual clauses approved by the relevant authorities or other recognised transfer mechanisms under the UK GDPR.
        </p>

        {/* 10. Children */}
        <h2 className="text-xl font-semibold mt-10 mb-4">10. Children</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          Socraty is designed for learners aged 16 and over. We do not knowingly collect personal data from anyone under the age of 16. If we become aware that a person under 16 has provided us with personal data, we will take steps to delete that information promptly. If you believe a child under 16 has submitted data to us, please contact us at privacy@socraty.ai.
        </p>

        {/* 11. Changes to This Policy */}
        <h2 className="text-xl font-semibold mt-10 mb-4">11. Changes to This Policy</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, regulatory or operational reasons. When we make changes, we will update the "Last updated" date at the top of this page. We encourage you to review this policy periodically.
        </p>

        {/* 12. Contact Us */}
        <h2 className="text-xl font-semibold mt-10 mb-4">12. Contact Us</h2>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          If you have any questions about this Privacy Policy or how we handle your personal data, please contact us at:
        </p>
        <p className="text-sm text-[#555] leading-relaxed mb-4">
          <strong>Email:</strong>{" "}
          <a href="mailto:privacy@socraty.ai" className="text-[#0A0909] underline hover:no-underline">
            privacy@socraty.ai
          </a>
        </p>
      </main>
    </div>
  );
}
