import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileText,
  Info,
  MoreVertical,
  PlusCircle,
  Search,
  Sparkles,
  ThumbsUp,
  Users,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { listSessions, type Session } from "@/lib/api";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Test Sessions | Read The Room" },
      {
        name: "description",
        content:
          "Manage video testing sessions, review participant reaction counts, and open dashboards.",
      },
    ],
  }),
  component: SessionsPage,
});

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    listSessions()
      .then((data) => setSessions(data))
      .catch((err) => console.error("Failed to load sessions:", err))
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = sessions.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.video_url && s.video_url.toLowerCase().includes(q))
    );
  });

  const totalReactions = sessions.reduce((acc, s) => acc + (s.reaction_count || 0), 0);
  const completedSessions = sessions.filter((s) => (s.reaction_count || 0) > 0).length;

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <span>Product Owner Sessions</span>
            </div>
            <h1 className="text-2xl font-bold">Video Test Sessions</h1>
            <p className="text-sm text-muted-foreground">
              Monitor test sessions created by your team and review incoming participant reaction
              statistics.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/share"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <PlusCircle className="h-4 w-4" /> Submit Video & Create Test
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card-surface p-4 rounded-2xl flex items-center gap-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Video className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Total Test Sessions</p>
              <p className="text-2xl font-bold font-display">{sessions.length}</p>
            </div>
          </div>

          <div className="card-surface p-4 rounded-2xl flex items-center gap-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-positive-soft text-positive">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Tested Sessions</p>
              <p className="text-2xl font-bold font-display">{completedSessions}</p>
            </div>
          </div>

          <div className="card-surface p-4 rounded-2xl flex items-center gap-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-info-soft text-primary">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Total Reactions Captured</p>
              <p className="text-2xl font-bold font-display">{totalReactions}</p>
            </div>
          </div>

          <div className="card-surface p-4 rounded-2xl flex items-center gap-3.5">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Active Studies</p>
              <p className="text-2xl font-bold font-display">
                {sessions.filter((s) => (s.reaction_count || 0) === 0).length} waiting
              </p>
            </div>
          </div>
        </div>

        {/* Sessions Table */}
        <section className="card-surface p-5 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">All Test Sessions</h2>
              <p className="text-xs text-muted-foreground">
                Click any session to view its reaction intensity graph and AI study summary
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tests or session ID..."
                className="rounded-xl border border-input bg-card py-2 pl-9 pr-3 text-xs outline-none focus:border-ring w-64"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Loading sessions...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
              <p className="text-sm font-semibold">No test sessions found</p>
              <p className="text-xs text-muted-foreground">
                Get started by submitting a video and generating your first participant link.
              </p>
              <Link
                to="/share"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <PlusCircle className="h-4 w-4" /> Create Test Session
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-3 font-medium">Session / Test Name</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Reactions</th>
                    <th className="pb-3 font-medium">Created</th>
                    <th className="pb-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSessions.map((s) => {
                    const hasReactions = (s.reaction_count || 0) > 0;
                    const testUrl =
                      typeof window !== "undefined"
                        ? `${window.location.origin}/test/${s.id}`
                        : `/test/${s.id}`;

                    return (
                      <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 pr-4">
                          <div>
                            <span className="font-semibold text-foreground">
                              {s.name || `Session ${s.id}`}
                            </span>
                            <span className="block text-xs font-mono text-muted-foreground">
                              ID: {s.id}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 pr-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              hasReactions
                                ? "bg-positive-soft text-positive"
                                : "bg-info-soft text-primary"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                hasReactions ? "bg-positive" : "bg-primary"
                              }`}
                            />
                            {hasReactions ? "Feedback Recorded" : "Awaiting Testers"}
                          </span>
                        </td>

                        <td className="py-3.5 pr-4 tabular-nums font-semibold">
                          {s.reaction_count || 0} events
                        </td>

                        <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {/* Copy Participant Link */}
                            <button
                              onClick={() => {
                                void navigator.clipboard?.writeText(testUrl);
                                setCopiedId(s.id);
                                window.setTimeout(() => setCopiedId(null), 2000);
                              }}
                              title="Copy Participant Test Link"
                              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                              {copiedId === s.id ? (
                                <Check className="h-3.5 w-3.5 text-positive" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>

                            {/* Open Test View as Participant */}
                            <Link
                              to="/test/$sessionId"
                              params={{ sessionId: s.id }}
                              target="_blank"
                              title="Open Link as Participant"
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                            >
                              <ExternalLink className="h-3 w-3 text-primary" />
                              <span>Participant</span>
                            </Link>

                            {/* View in Dashboard */}
                            <Link
                              to="/dashboard"
                              search={{ session: s.id }}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                              View Stats <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
