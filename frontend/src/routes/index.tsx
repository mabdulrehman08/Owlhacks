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
import poster from "@/assets/session-frame.jpg";
import faceMesh from "@/assets/face-mesh.svg";

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
    body: "Reactions land in your dashboard as a timeline, top emotional moments, and an AI agent you can ask about what happened.",
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

const timelineBars = [28, 42, 55, 38, 72, 60, 85, 46, 64, 90, 50, 34];

// face-mesh.svg and the coordinates below come from running MediaPipe FaceMesh
// on session-frame.jpg (1280x720). Regenerate both if the photo changes.
function FaceLandmarkOverlay() {
  const box = { x1: 530, y1: 138, x2: 820, y2: 458 };
  const arm = 28;
  const scan = "#5eead4";

  return (
    <>
      <img
        src={faceMesh}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <svg
        viewBox="0 0 1280 720"
        className="pointer-events-none absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <circle cx={626.6} cy={264.8} r={4} fill="white" className="animate-pulse" />
        <circle cx={739.5} cy={243} r={4} fill="white" className="animate-pulse" />
        <g stroke={scan} strokeWidth={5} strokeLinecap="round" fill="none">
          <path d={`M ${box.x1} ${box.y1 + arm} L ${box.x1} ${box.y1} L ${box.x1 + arm} ${box.y1}`} />
          <path d={`M ${box.x2 - arm} ${box.y1} L ${box.x2} ${box.y1} L ${box.x2} ${box.y1 + arm}`} />
          <path d={`M ${box.x1} ${box.y2 - arm} L ${box.x1} ${box.y2} L ${box.x1 + arm} ${box.y2}`} />
          <path d={`M ${box.x2 - arm} ${box.y2} L ${box.x2} ${box.y2} L ${box.x2} ${box.y2 - arm}`} />
        </g>
      </svg>
    </>
  );
}

function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="Read The Room" width={30} height={30} className="h-7.5 w-7.5" />
            <span className="font-display text-lg font-bold tracking-tight">Read The Room</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Features
            </a>
            <Link to="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Demo dashboard
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
            <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-muted">
              Features
            </a>
            <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2.5 text-sm font-medium hover:bg-muted">
              Demo dashboard
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
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-8 text-center sm:pt-24">
        <span className="mx-auto mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Facial reaction analytics for video testing
        </span>

        <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
          Know how your video
          <br />
          <span className="bg-gradient-to-r from-primary to-[oklch(0.58_0.2_300)] bg-clip-text text-transparent">
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
            to="/dashboard"
            search={{ session: "demo" }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-input bg-card px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            View demo dashboard
          </Link>
        </div>

      </section>

      {/* Hero mockup */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="relative">
          <div className="card-surface overflow-hidden rounded-3xl shadow-pop">
            <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-negative/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-notable/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-positive/50" />
              <span className="ml-3 truncate font-mono text-[11px] text-muted-foreground">
                readtheroom.app/dashboard
              </span>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-[1.5fr_1fr] sm:p-5">
              <div className="space-y-3">
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
                  <img src={poster} alt="" className="h-full w-full object-cover opacity-90" />
                  <FaceLandmarkOverlay />
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-positive" /> 128 reactions logged
                  </span>
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5eead4] animate-pulse" />
                    Face detected · 98%
                  </span>
                </div>
                <div className="flex h-16 items-end gap-1 rounded-xl bg-muted/60 p-3">
                  {timelineBars.map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}%` }}
                      className="flex-1 rounded-t-sm bg-primary/50"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-xl bg-positive-soft p-3">
                  <p className="text-[10px] font-medium text-muted-foreground">Most positive moment</p>
                  <p className="mt-1 text-sm font-semibold">😄 1:32 · joy</p>
                </div>
                <div className="rounded-xl bg-notable-soft p-3">
                  <p className="text-[10px] font-medium text-muted-foreground">Biggest reaction</p>
                  <p className="mt-1 text-sm font-semibold">😮 2:47 · surprise</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <p className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" /> Ask the agent
                  </p>
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    "Where did viewers get confused?"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -left-4 top-8 hidden rounded-2xl border border-border bg-card px-4 py-2.5 shadow-pop sm:block">
            <p className="text-xs font-semibold">😄 92% positive reactions</p>
          </div>
          <div className="absolute -right-4 bottom-10 hidden rounded-2xl border border-border bg-card px-4 py-2.5 shadow-pop sm:block">
            <p className="text-xs font-semibold">🔗 1 link · unlimited testers</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
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

      {/* Features */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
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

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Read The Room" width={22} height={22} className="h-5.5 w-5.5" />
            <span className="font-display text-sm font-bold">Read The Room</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Read The Room. Built for OwlHacks.</p>
        </div>
      </footer>
    </div>
  );
}
