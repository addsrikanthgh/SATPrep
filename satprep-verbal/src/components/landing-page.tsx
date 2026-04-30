"use client";

import { signIn } from "next-auth/react";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7h7M9 11h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path d="M12 5a7 7 0 0 0-7 7c0 2.5 1.3 4.7 3.2 6H12m0-13a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.2 6H12m0-13v13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 18h6v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const features = [
  {
    icon: <BookIcon />,
    title: "Realistic SAT Questions",
    description:
      "Practice with 1,000+ SAT-style passage questions across all domains and skills — crafted to mirror the Digital SAT format.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: <ChartIcon />,
    title: "Performance Analytics",
    description:
      "Track accuracy by domain, skill, and difficulty. Identify weak areas and watch your progress improve over time.",
    color: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: <ClockIcon />,
    title: "Focused Practice",
    description:
      "Short, targeted sessions designed to fit your schedule. Each passage takes just minutes — perfect for daily practice.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: <BrainIcon />,
    title: "Skill-Based Learning",
    description:
      "Coverage across Craft & Structure, Information & Ideas, and Expression of Ideas — every skill the SAT tests.",
    color: "bg-sky-50 text-sky-600",
  },
];

const steps = [
  {
    number: "01",
    title: "Practice",
    description:
      "Read SAT-style passages and answer targeted multiple-choice questions. Each session adapts to your chosen domain and skill.",
  },
  {
    number: "02",
    title: "Analyze",
    description:
      "Review detailed answer explanations instantly. Track your accuracy across every skill category with live analytics.",
  },
  {
    number: "03",
    title: "Improve",
    description:
      "Focus on your weak spots with targeted word and passage practice. Build vocabulary and reading stamina that sticks.",
  },
];

const stats = [
  { value: "1,000+", label: "SAT-style questions" },
  { value: "26", label: "Skills covered" },
  { value: "3", label: "Practice modes" },
  { value: "100%", label: "Digital SAT aligned" },
];

export function LandingPage() {
  function handleGoogleLogin() {
    void signIn("google", { callbackUrl: "/practice/meaning" });
  }

  return (
    <div className="min-h-screen bg-white font-[var(--font-inter)]">
      {/* ── Top Navigation ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-blue-700/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold text-white">
              S
            </div>
            <span className="text-base font-semibold tracking-wide text-white">SAT Prep</span>
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/20 transition hover:bg-white/20"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 pb-24 pt-20 sm:pb-32 sm:pt-28">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-20 h-[600px] w-[600px] rounded-full bg-indigo-900/30 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-400/10 blur-2xl" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide text-blue-100 ring-1 ring-white/20">
            Built for the Digital SAT
          </div>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Master the Digital SAT
            <br />
            <span className="text-blue-200">with Confidence</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-blue-100">
            Adaptive passage practice, real SAT-style questions, and detailed performance analytics — everything you need to raise your score.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-blue-700 shadow-lg shadow-blue-900/20 transition hover:bg-blue-50 sm:w-auto"
            >
              <GoogleIcon />
              Get Started with Google
            </button>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 sm:w-auto"
            >
              Sign In
              <ArrowRightIcon />
            </button>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-blue-200">
            {["Free to use", "No credit card required", "Instant access"].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckIcon />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Strip ────────────────────────────────────────── */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-4xl grid-cols-2 divide-x divide-slate-200 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="py-8 text-center">
              <p className="text-3xl font-bold text-blue-600">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need to score higher
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Purpose-built tools that cover every corner of the Digital SAT verbal section.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Three focused steps from first practice to test-day confidence.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.number} className="relative flex flex-col items-start">
                {i < steps.length - 1 ? (
                  <div className="absolute left-8 top-8 hidden h-0.5 w-[calc(100%+2rem)] bg-gradient-to-r from-blue-200 to-transparent sm:block" />
                ) : null}
                <div className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25">
                  <span className="text-xl font-bold text-white">{step.number}</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ───────────────────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                quote: "The passage practice is the most realistic SAT prep I've used. The explanations actually teach you why the answer is right.",
                name: "High School Junior",
                tag: "Target: 1400+",
              },
              {
                quote: "I love being able to see exactly which skills I'm weak on. The analytics make it so much easier to focus my study time.",
                name: "SAT Prep Student",
                tag: "Improved 120 pts",
              },
              {
                quote: "Short sessions fit perfectly into my daily routine. I do 10 minutes every morning and my vocabulary has improved dramatically.",
                name: "College Applicant",
                tag: "Daily Practice",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} viewBox="0 0 16 16" className="h-4 w-4 fill-amber-400" aria-hidden="true">
                      <path d="M8 1l1.85 3.75L14 5.5l-3 2.92.71 4.12L8 10.5l-3.71 1.95.71-4.12-3-2.92 4.15-.75z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-600">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{t.name}</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">{t.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Start your SAT prep today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-blue-100">
            Join students already practicing with realistic passages, instant feedback, and skill-level analytics.
          </p>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="mt-8 flex items-center gap-2.5 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-blue-700 shadow-xl shadow-blue-900/20 transition hover:bg-blue-50 mx-auto"
          >
            <GoogleIcon />
            Get Started with Google — It&rsquo;s Free
          </button>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-900 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white">
                S
              </div>
              <span className="text-sm font-semibold text-white">SAT Prep</span>
            </div>
            <div className="flex gap-6 text-sm text-slate-400">
              <span className="cursor-default hover:text-slate-200 transition">About</span>
              <span className="cursor-default hover:text-slate-200 transition">Contact</span>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="hover:text-slate-200 transition"
              >
                Sign In
              </button>
            </div>
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} SAT Prep. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
