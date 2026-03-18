"use client";

const values = [
  {
    title: "Learner-First",
    description:
      "Every decision we make starts with the learner. If it does not help someone learn better, we do not build it.",
  },
  {
    title: "Evidence-Based",
    description:
      "We ground our approach in learning science, not trends. What works matters more than what looks good on a slide.",
  },
  {
    title: "Simplicity",
    description:
      "Learning is already hard enough. Our tools should feel effortless, so learners can focus on what matters.",
  },
  {
    title: "Privacy by Design",
    description:
      "Your learning data is yours. We build with privacy at the core, not as an afterthought.",
  },
];

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[rgba(2,1,1,0.07)]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Socraty" className="h-8 object-contain" />
          </a>
          <a href="/" className="text-sm text-[#666] hover:text-[#0A0909] transition">Back to home</a>
        </div>
      </nav>

      <main className="max-w-[800px] mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-[#0A0909] mb-12 text-center">About Socraty</h1>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0A0909] mb-4">Our Mission</h2>
          <p className="text-[#444] text-base leading-relaxed">
            We believe the biggest problem in education is not access to information, but the
            ability to turn information into real learning. Socraty exists to bridge that gap.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0A0909] mb-4">What We Do</h2>
          <p className="text-[#444] text-base leading-relaxed">
            Socraty is a learning execution platform. Instead of adding more content to the pile, we
            help learners actually process, retain, and apply what they consume. Whether it is a
            YouTube lecture, a research paper, or a podcast, Socraty turns passive consumption into
            active learning through structured review, recall practice, and personalised action items.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-[#0A0909] mb-6">Our Values</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-white rounded-2xl border border-[rgba(2,1,1,0.07)] p-6"
              >
                <h3 className="text-base font-semibold text-[#0A0909] mb-2">{value.title}</h3>
                <p className="text-sm text-[#666] leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center">
          <p className="text-sm text-[#666] mb-2">Find us on LinkedIn</p>
          <a
            href="https://www.linkedin.com/company/socratyai/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#0A0909] hover:underline"
          >
            linkedin.com/company/socratyai
          </a>
        </section>
      </main>
    </div>
  );
}
