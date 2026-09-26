import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronRight as Arrow,
  FileText,
  Info,
  ListOrdered,
  Pause,
  Play,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ReactionTimeline } from "@/components/ReactionTimeline";
import { SessionAgentChat } from "@/components/SessionAgentChat";
import {
  RECOMMENDATIONS,
  REACTION_META,
  SUMMARY,
  TOP_MOMENTS,
  VIDEO_DURATION,
  VIDEO_SRC,
  formatTime,
} from "@/lib/reaction-data";
import poster from "@/assets/session-frame.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Session Dashboard | ReactionLens" },
      {
        name: "description",
        content:
          "Review a participant session: video playback, a reaction intensity timeline with emoji markers, and agent recommendations.",
      },
      { property: "og:title", content: "Session Dashboard | ReactionLens" },
      {
        property: "og:description",
        content:
          "Facial reaction analytics for video tests: timeline peaks, top moments to review, and an agent that answers questions about the session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const recTone = {
  info: { wrap: "bg-info-soft", icon: BarChart3, fg: "text-primary" },
  warn: { wrap: "bg-negative-soft", icon: FileText, fg: "text-negative" },
  good: { wrap: "bg-positive-soft", icon: ThumbsUp, fg: "text-positive" },
};

function Dashboard() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const seek = (t: number) => {
    const v = videoRef.current;
    const clamped = Math.max(0, Math.min(VIDEO_DURATION, t));
    setTime(clamped);
    if (v?.duration) v.currentTime = (clamped / VIDEO_DURATION) * v.duration;
    void v?.play();
  };

  return (
    <AppShell>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="card-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold">Session Playback</h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Session 3 of 12
                <button className="grid h-7 w-7 place-items-center rounded-lg border border-border hover:bg-muted">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="grid h-7 w-7 place-items-center rounded-lg border border-border hover:bg-muted">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-foreground">
              <video
                ref={videoRef}
                src={VIDEO_SRC}
                poster={poster}
                playsInline
                className="aspect-video w-full object-cover"
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration) setTime((v.currentTime / v.duration) * VIDEO_DURATION);
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-foreground/70 px-2.5 py-1.5 text-xs font-medium text-background backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-positive" /> Face detected
              </span>
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-foreground/90 to-transparent px-3 pb-3 pt-8">
                <button
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    playing ? v.pause() : void v.play();
                  }}
                  aria-label={playing ? "Pause" : "Play"}
                  className="grid h-9 w-9 place-items-center rounded-full bg-background/90 text-foreground"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <span className="text-xs font-medium tabular-nums text-background">
                  {formatTime(time)} / {formatTime(VIDEO_DURATION)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={VIDEO_DURATION}
                  value={Math.round(time)}
                  onChange={(e) => seek(Number(e.target.value))}
                  aria-label="Seek"
                  className="h-1.5 flex-1 accent-primary"
                />
              </div>
            </div>
          </section>

          <section className="card-surface p-5">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
              Reaction Intensity Timeline
              <Info className="h-4 w-4 text-muted-foreground" />
            </h2>
            <ReactionTimeline currentTime={time} onSeek={seek} />
            <p className="mt-4 flex gap-2 rounded-xl bg-info-soft p-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              These markers show moments with notable facial expression changes (e.g. smile,
              surprise, confusion). Click a marker to jump to that moment in the video. Reactions are
              observable signals, not a direct measure of thoughts or intent.
            </p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Most Positive Moment", m: SUMMARY.mostPositive, bg: "bg-positive-soft" },
              { label: "Biggest Reaction", m: SUMMARY.biggest, bg: "bg-notable-soft" },
              { label: "Negative Shift", m: SUMMARY.negativeShift, bg: "bg-negative-soft" },
            ].map(({ label, m, bg }) => (
              <button
                key={label}
                onClick={() => seek(m.t)}
                className="card-surface p-4 text-left transition-shadow hover:shadow-pop"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`grid h-9 w-9 place-items-center rounded-full text-lg ${bg}`}>
                    {REACTION_META[m.kind].emoji}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <p className="mt-3 font-display text-3xl font-semibold">{formatTime(m.t)}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{m.note}</p>
              </button>
            ))}

            <div className="card-surface p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-info-soft text-primary">
                  <ListOrdered className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  Top 5 Moments to Review
                </span>
              </div>
              <ol className="mt-3 space-y-1.5 text-xs">
                {TOP_MOMENTS.map((m, i) => (
                  <li key={m.t}>
                    <button
                      onClick={() => seek(m.t)}
                      className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-muted"
                    >
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span className="font-semibold tabular-nums">{formatTime(m.t)}</span>
                      <span className="truncate text-muted-foreground">{m.label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <section className="card-surface p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h3 className="text-base font-semibold">Agent Recommendations</h3>
                <p className="text-xs text-muted-foreground">
                  Based on facial reactions and session context
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {RECOMMENDATIONS.map((r) => {
                const tone = recTone[r.tone];
                const Icon = tone.icon;
                return (
                  <button
                    key={r.title}
                    onClick={() => seek(r.t)}
                    className={`flex w-full items-start gap-3 rounded-2xl p-3.5 text-left transition-transform hover:-translate-y-0.5 ${tone.wrap}`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-card">
                      <Icon className={`h-4 w-4 ${tone.fg}`} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{r.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {r.body}
                      </span>
                    </span>
                    <Arrow className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </section>

          <SessionAgentChat />
        </div>
      </div>
    </AppShell>
  );
}
