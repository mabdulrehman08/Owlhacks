import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  Clock,
  Cpu,
  EyeOff,
  GraduationCap,
  Lock,
  Megaphone,
  MousePointerClick,
  Rocket,
  TrendingDown,
  Upload,
} from "lucide-react";

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{body}</p>}
    </div>
  );
}

const problems = [
  {
    icon: ClipboardList,
    title: "Surveys come too late",
    body: "By the time someone fills in a form, the moment has passed. They remember a vague overall feeling, not the second it changed.",
  },
  {
    icon: TrendingDown,
    title: "Metrics say that, not where",
    body: "Views, likes and drop-off tell you something went wrong. They can't tell you which sentence, slide or cut caused it.",
  },
  {
    icon: Clock,
    title: "People can't point to it",
    body: "Ask a viewer where they got lost and most can't say. Their face already showed you, at the exact timestamp.",
  },
];

/** The problem the product solves. */
export function ProblemSection() {
  return (
    <section id="problem" className="border-t border-border py-20">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading
          eyebrow="The problem"
          title="Surveys ask people what they felt. Faces show you."
          body="Every video has a moment where the audience leans in, and a moment where you lose them. Today you find out weeks later, if at all."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {problems.map((p) => (
            <div key={p.title} className="card-surface p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-negative-soft text-negative">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-2xl text-center font-display text-lg font-semibold sm:text-xl">
          Read The Room watches the room for you, so you know{" "}
          <span className="text-primary">exactly which second</span> to keep, fix or cut.
        </p>
      </div>
    </section>
  );
}

const useCases = [
  {
    icon: Megaphone,
    who: "Ads & marketing",
    body: "Find the second your hook lands, and the second attention drops, before you spend on media.",
  },
  {
    icon: MousePointerClick,
    who: "UX research",
    body: "Record a prototype walkthrough and spot confusion in a flow before engineering builds it.",
  },
  {
    icon: GraduationCap,
    who: "Courses & teaching",
    body: "See where students lose the thread in a lecture, and which explanation finally clicks.",
  },
  {
    icon: Rocket,
    who: "Founders & pitches",
    body: "Test your demo-day or investor video on real people and tighten the parts that fall flat.",
  },
];

/** Who it is for. */
export function UseCasesSection() {
  return (
    <section id="use-cases" className="border-t border-border bg-muted/30 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading eyebrow="Who it's for" title="Anyone whose video has to land" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((u) => (
            <div key={u.who} className="card-surface p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <u.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{u.who}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const privacy = [
  {
    icon: Cpu,
    title: "Runs on the viewer's device",
    body: "Faces are analyzed in the browser with MediaPipe vision models. No video processing on our servers.",
  },
  {
    icon: EyeOff,
    title: "Footage never leaves the browser",
    body: "The webcam stream is never uploaded or recorded. Only numbers are sent: a timestamp, an emotion and its intensity.",
  },
  {
    icon: Lock,
    title: "Opt-in, every time",
    body: "Testers choose to open the link and grant camera access. Nothing happens until they say yes.",
  },
];

/** Privacy and trust. Claims match the participant page (test/$sessionId.tsx). */
export function PrivacySection() {
  return (
    <section id="privacy" className="border-t border-border py-20">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading
          eyebrow="Privacy by design"
          title="We read reactions, not faces"
          body="Reading the room shouldn't mean recording it."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {privacy.map((p) => (
            <div key={p.title} className="card-surface p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-positive-soft text-positive">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Closing call to action. */
export function FinalCta() {
  return (
    <section className="px-6 pb-20">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#521A32] px-8 py-14 text-center text-primary-foreground shadow-pop">
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Stop guessing how your video lands.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm opacity-90 sm:text-base">
          Upload a video, send one link, and read the room in minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/share"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-primary transition-transform hover:-translate-y-0.5"
          >
            <Upload className="h-4 w-4" /> Upload a video <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/test/$sessionId"
            params={{ sessionId: "demo" }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Activity className="h-4 w-4" /> Try it on yourself
          </Link>
        </div>
      </div>
    </section>
  );
}
