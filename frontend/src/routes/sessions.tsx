import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Info,
  MoreVertical,
  Search,
  Sparkles,
  ThumbsUp,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  COMMON_MOMENTS,
  PARTICIPANTS,
  REACTION_META,
  SESSION_AVERAGES,
  STUDY_INSIGHTS,
} from "@/lib/reaction-data";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Sessions | ReactionLens" },
      {
        name: "description",
        content:
          "Compare reaction intensity across participant sessions, see the most common notable moments, and read the AI study summary.",
      },
      { property: "og:title", content: "Sessions | ReactionLens" },
      {
        property: "og:description",
        content:
          "Participant-by-participant facial reaction results with study-level insights across all sessions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Sessions,
});

const insightTone = {
  info: { wrap: "bg-info-soft", icon: BarChart3, fg: "text-primary" },
  warn: { wrap: "bg-negative-soft", icon: FileText, fg: "text-negative" },
  good: { wrap: "bg-positive-soft", icon: ThumbsUp, fg: "text-positive" },
};

function Sessions() {
  const max = Math.max(...SESSION_AVERAGES);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sessions</h1>
          <p className="text-sm text-muted-foreground">8 participants · Completed Apr 12, 2024</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground" /> Apr 1, 2024 – Apr 12, 2024
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: Users, label: "Total Participants", value: "8", sub: "8 of 8 completed", badge: "100%" },
          { icon: BarChart3, label: "Avg Reaction Intensity", value: "2.4", sub: "vs. previous study", badge: "↑ 12%" },
          { icon: null, label: "Most Common Reaction", value: "Surprise", sub: "42% of notable moments", badge: "😮" },
          { icon: ClipboardCheck, label: "Sessions Completed", value: "8", sub: "0 in progress", badge: "100%" },
        ].map((c) => (
          <div key={c.label} className="card-surface flex items-start gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-lg text-primary">
              {c.icon ? <c.icon className="h-5 w-5" /> : "😮"}
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="font-display text-2xl font-semibold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.sub}</p>
            </div>
            <span className="ml-auto rounded-full bg-positive-soft px-2 py-1 text-[11px] font-semibold text-positive">
              {c.badge}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            Reaction Intensity Across Sessions <Info className="h-4 w-4 text-muted-foreground" />
          </h2>
          <div className="flex h-56 items-end gap-3">
            {SESSION_AVERAGES.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-accent"
                  style={{ height: `${(v / max) * 100}%` }}
                  title={`S${i + 1}: ${v}`}
                />
                <span className="text-[11px] text-muted-foreground">S{i + 1}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            Common Moments Reviewed <Info className="h-4 w-4 text-muted-foreground" />
          </h2>
          <ol className="space-y-3">
            {COMMON_MOMENTS.map((m, i) => (
              <li key={m.label} className="flex items-center gap-3 text-sm">
                <span className="w-3 text-muted-foreground">{i + 1}</span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-muted">
                  {REACTION_META[m.kind].emoji}
                </span>
                <span className="w-32 truncate">{m.label}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${m.pct}%` }} />
                </span>
                <span className="w-9 text-right text-xs font-semibold tabular-nums">{m.pct}%</span>
                <span className="w-8 text-right text-xs text-muted-foreground">{m.count}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card-surface p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Participant Sessions</h2>
            <span className="inline-flex items-center gap-2 rounded-xl border border-input px-3 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" /> Search participants...
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Participant</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Top Reaction</th>
                  <th className="pb-2 font-medium">Notable Moments</th>
                  <th className="pb-2 font-medium">Duration</th>
                  <th className="pb-2 font-medium sr-only">Actions</th>
                </tr>
              </thead>
              <tbody>
                {PARTICIPANTS.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="py-3">
                      <span className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                          {p.initials}
                        </span>
                        <span>
                          {p.id} · {p.name}
                        </span>
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-positive-soft px-2.5 py-1 text-xs font-medium text-positive">
                        <span className="h-1.5 w-1.5 rounded-full bg-positive" /> Completed
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{REACTION_META[p.top].emoji}</span>
                        <span>
                          <span className="block font-medium">{REACTION_META[p.top].label}</span>
                          <span className="block text-xs text-muted-foreground">
                            {p.moments} moments
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {p.tags.map((t) => (
                          <span key={t} className="rounded-lg bg-muted px-2 py-1 text-xs">
                            {t}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="py-3 tabular-nums">{p.duration}</td>
                    <td className="py-3 text-right">
                      <Link to="/" aria-label={`Open ${p.name}'s session`} className="inline-grid h-7 w-7 place-items-center rounded-lg hover:bg-muted">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-base font-semibold">AI Study Summary</h2>
              <p className="text-xs text-muted-foreground">Key insights from 8 participant sessions</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {STUDY_INSIGHTS.map((s) => {
              const tone = insightTone[s.tone];
              const Icon = tone.icon;
              return (
                <div key={s.title} className={`flex items-start gap-3 rounded-2xl p-3.5 ${tone.wrap}`}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-card">
                    <Icon className={`h-4 w-4 ${tone.fg}`} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{s.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
