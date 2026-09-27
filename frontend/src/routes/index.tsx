import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Camera,
  Menu,
  Share2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";
import { LiveDemo } from "@/components/landing/LiveDemo";
import { FinalCta, PrivacySection, ProblemSection, UseCasesSection } from "@/components/landing/StorySections";
import { Wordmark } from "@/components/Wordmark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Read The Room — Know how your video really lands" },
      {
        name: "description",
        content:
          "Upload a video, send one link, and watch real facial reactions turn into a timeline, top moments, and an AI agent you can ask questions.",
      },
      { property: "og:title", content: "Read The Room — Know how your video really lands" },
      {
        property: "og:description",
        content:
          "Upload a video, send one link, and watch real facial reactions turn into a timeline, top moments, and an AI agent you can ask questions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  {
    icon: Upload,
    title: "Upload your video",
    body: "Drop in the ad, prototype walkthrough, or pitch you want tested. No editing or special format required.",
  },
  {
    icon: Camera,
    title: "Send one link",
    body: "Participants open it in any browser, watch your video, and their facial reactions are read locally via on-device vision models.",
  },
  {
    icon: BarChart3,
    title: "Get the analysis",
    body: "Reactions turn into an interactive timeline, top emotional moments, and an AI agent you can ask about what happened.",
  },
];

const features = [
  {
    icon: BarChart3,
    title: "Reaction timeline",
    body: "See intensity rise and fall against your video's own clock, with emoji markers on every notable expression.",
  },
  {
    icon: Sparkles,
    title: "AI agent Q&A",
    body: "Ask plain-language questions — \"where did people get confused?\" — and get answers grounded in real reaction data.",
  },
  {
    icon: Activity,
    title: "Live face tracker",
    body: "Preview the detector on your own webcam before you send a test out, so you know exactly what participants see.",
  },
  {
    icon: Share2,
    title: "One shareable link",
    body: "No installs, no accounts for testers. Send a link, collect reactions from as many viewers as you want.",
  },
];

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Read The Room" width={30} height={30} className="h-7.5 w-7.5" />
            <Wordmark className="text-lg" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              How it works
            </a>
            <a href="#live-demo" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Live demo
            </a>
            <a href="#use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Use cases
            </a>
            <a href="#privacy" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Privacy
            </a>
            <Link to="/live" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Face tracker
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/share"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-pop transition-colors hover:bg-primary/90"
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-border bg-background px-6 py-4 md:hidden">
            <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-muted">
              How it works
            </a>
            <a href="#live-demo" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-muted">
              Live demo
            </a>
            <a href="#use-cases" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-muted">
              Use cases
            </a>
            <a href="#privacy" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-muted">
              Privacy
            </a>
            <Link to="/live" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-muted">
              Face tracker
            </Link>
            <Link
              to="/share"
              onClick={() => setMenuOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-20 text-center sm:pt-24 sm:pb-28">
        <span className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Facial reaction analytics for video testing
        </span>

        <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
          Know how your video
          <br />
          <span className="text-primary">
            really lands
          </span>{" "}
          before you ship it
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Upload a video, send one link, and watch real facial reactions turn into a timeline,
          top emotional moments, and an AI agent you can ask questions.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/share"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop transition-transform hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto"
          >
            <Upload className="h-4 w-4" /> Get started — upload a video
          </Link>
          <Link
            to="/live"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-input bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            <Activity className="h-4 w-4 text-primary" /> Try live face tracker
          </Link>
        </div>
      </section>

      <ProblemSection />

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-xl text-center">
            <span className="eyebrow">
              How it works
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              From raw footage to real feelings in three steps
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.title} className="card-surface p-6 text-left">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LiveDemo />

      {/* Features */}
      <section id="features" className="border-t border-border py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-xl text-center">
            <span className="eyebrow">
              Everything you need
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Built for people who ship video content
            </h2>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="card-surface flex items-start gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <UseCasesSection />

      <PrivacySection />

      <FinalCta />

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-center sm:flex-row sm:text-left">
          <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-85">
            <img src={logo} alt="Read The Room" width={22} height={22} className="h-5.5 w-5.5" />
            <Wordmark className="text-sm" />
          </Link>
          <p className="text-xs text-muted-foreground">© 2026 Read The Room. Built for OwlHacks.</p>
        </div>
      </footer>
    </div>
  );
}
