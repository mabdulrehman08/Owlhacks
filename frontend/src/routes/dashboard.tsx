import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight as Arrow,
  Copy,
  ExternalLink,
  FileText,
  Info,
  ListOrdered,
  Pause,
  Play,
  PlusCircle,
  Share2,
  Sparkles,
  ThumbsUp,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ReactionTimeline } from "@/components/ReactionTimeline";
import { SessionAgentChat } from "@/components/SessionAgentChat";
import {
  getInsights,
  getSession,
  listSessions,
  type Insights,
  type Session,
} from "@/lib/api";
import { formatTime } from "@/lib/reaction-data";
import poster from "@/assets/session-frame.jpg";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): { session?: string } => ({
    session: typeof search.session === "string" ? search.session : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Product Owner Dashboard | Read The Room" },
      {
        name: "description",
        content:
          "Review viewer facial reaction analytics for your video tests: reaction peaks, top moments, and an AI agent that explains viewer emotions.",
      },
    ],
  }),
  component: Dashboard,
});

export function Dashboard() {
  const search = Route.useSearch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string>(search.session || "demo");
  const [currentSession, setCurrentSession] = useState<Session | null>(null);

  // Insights & Data state
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync with search parameter if changed
  useEffect(() => {
    if (search.session) {
      setSessionId(search.session);
    }
  }, [search.session]);

  // Load available sessions from backend
  useEffect(() => {
    listSessions()
      .then((items) => {
        setSessions(items);
        if (items.length > 0 && !search.session) {
          // Keep current sessionId if in list, otherwise select first
          if (!items.some((s) => s.id === sessionId) && sessionId !== "demo") {
            setSessionId(items[0].id);
          }
        }
      })
      .catch((err) => console.error("Failed to list sessions:", err));
  }, [sessionId, search.session]);

  // Load session metadata
  useEffect(() => {
    getSession(sessionId)
      .then(setCurrentSession)
      .catch((err) => {
        console.warn("Could not load session metadata:", err);
        setCurrentSession(null);
      });
  }, [sessionId]);

  // Load insights for the selected session
  useEffect(() => {
    setLoading(true);
    setError(null);
    getInsights(sessionId)
      .then(setInsights)
      .catch((err) => {
        console.error("Failed to load insights:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  const seek = (t: number) => {
    const v = videoRef.current;
    const clamped = Math.max(0, Math.min(videoDuration || 270, t));
    setTime(clamped);
    if (v && v.duration) {
      v.currentTime = (clamped / (videoDuration || v.duration)) * v.duration;
    }
    void v?.play();
  };

  const mostPositive = insights?.most_positive;
  const biggest = insights?.biggest_reaction;
  const negativeShift = insights?.most_negative_shift;
  const topMoments = insights?.top_5 || [];
  const reactionCount = insights?.summary?.reaction_count ?? 0;

  const testLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/test/${sessionId}`
      : `/test/${sessionId}`;

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Top Session Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary uppercase tracking-wider">
                Product Owner Dashboard
              </span>
              <span className="text-xs text-muted-foreground font-mono">ID: {sessionId}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {currentSession?.name || "Session Playback & Analysis"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Session Switcher Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Session:</span>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="rounded-xl border border-input bg-card px-3 py-2 text-xs font-medium outline-none focus:border-ring"
              >
                <option value="demo">demo (Mock Study)</option>
                {sessions
                  .filter((s) => s.id !== "demo")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name ? `${s.name} (${s.id})` : s.id} · {s.reaction_count} reactions
                    </option>
                  ))}
              </select>
            </div>

            {/* Copy Participant Test Link */}
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(testLink);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-positive" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Link Copied" : "Copy Participant Link"}
            </button>

            {/* Open Participant View Directly */}
            <Link
              to={`/test/${sessionId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open Link as Participant
            </Link>

            {/* Create New Test */}
            <Link
              to="/share"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <PlusCircle className="h-3.5 w-3.5" /> Submit New Video
            </Link>
          </div>
        </div>

        {/* Empty State Banner if Session Has 0 Reactions */}
        {!loading && reactionCount === 0 && (
          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center space-y-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary mx-auto">
              <Share2 className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Awaiting Participant Feedback</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                This test session has been created, but no user reactions have been submitted yet.
                Send the test link to participants so their facial reactions stream into this dashboard.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <input
                readOnly
                value={testLink}
                className="rounded-xl border border-input bg-card px-3 py-2 text-xs font-mono w-72"
              />
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(testLink);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                }}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <Link
                to={`/test/${sessionId}`}
                className="rounded-xl border border-input bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                Take Test Now
              </Link>
            </div>
          </div>
        )}

        {/* Main Dashboard Grid */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Left Column: Video Playback & Timeline */}
          <div className="space-y-5">
            {/* Video Playback Section */}
            <section className="card-surface p-5 rounded-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" /> Tested Video Playback
                </h2>
                <span className="text-xs text-muted-foreground">
                  {currentSession?.video_url ? "Session Video" : "Demo Reference Clip"}
                </span>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-black aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={currentSession?.video_url || undefined}
                  poster={poster}
                  playsInline
                  className="aspect-video w-full object-cover"
                  onLoadedMetadata={(e) => {
                    setVideoDuration(e.currentTarget.duration);
                  }}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (v.duration) setTime(v.currentTime);
                  }}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                />

                <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-positive" />
                  {reactionCount > 0 ? `${reactionCount} reactions logged` : "No reactions yet"}
                </span>

                {/* Video Controls Overlay */}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-3 pb-3 pt-8">
                  <button
                    onClick={() => {
                      const v = videoRef.current;
                      if (!v) return;
                      playing ? v.pause() : void v.play();
                    }}
                    aria-label={playing ? "Pause" : "Play"}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white text-black hover:bg-white/90"
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>
                  <span className="text-xs font-medium tabular-nums text-white">
                    {formatTime(time)} / {formatTime(videoDuration || 270)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration || 270}
                    value={Math.round(time)}
                    onChange={(e) => seek(Number(e.target.value))}
                    aria-label="Seek"
                    className="h-1.5 flex-1 accent-primary cursor-pointer"
                  />
                </div>
              </div>
            </section>

            {/* Reaction Intensity Timeline Section */}
            <section className="card-surface p-5 rounded-2xl">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <BarChart3 className="h-4 w-4 text-primary" /> Viewer Reaction Intensity Timeline
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </h2>
                <span className="text-xs text-muted-foreground font-mono">
                  {reactionCount} data points
                </span>
              </div>

              {loading ? (
                <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                  Loading reactions...
                </div>
              ) : error ? (
                <div className="flex h-52 items-center justify-center rounded-lg bg-negative-soft p-4 text-sm text-negative">
                  Error: {error}
                </div>
              ) : (
                <ReactionTimeline sessionId={sessionId} currentTime={time} onSeek={seek} />
              )}

              <p className="mt-4 flex gap-2 rounded-xl bg-info-soft p-3 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Emoji markers indicate moments of notable facial expressions (joy, surprise,
                confusion). Click an emoji marker or peak to jump directly to that moment in the
                video.
              </p>
            </section>

            {/* Stats Highlights: Most Positive, Biggest Reaction, Negative Shift, Top 5 */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {loading ? (
                <div className="col-span-full flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Loading insights...
                </div>
              ) : (
                <>
                  {mostPositive ? (
                    <button
                      onClick={() => seek(mostPositive.timestamp)}
                      className="card-surface p-4 text-left transition-shadow hover:shadow-pop rounded-2xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-positive-soft text-lg">
                          😄
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          Most Positive Moment
                        </span>
                      </div>
                      <p className="mt-3 font-display text-2xl font-semibold">
                        {formatTime(mostPositive.timestamp)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {mostPositive.type} (intensity: {mostPositive.intensity.toFixed(2)})
                      </p>
                    </button>
                  ) : (
                    <div className="card-surface p-4 rounded-2xl text-left text-muted-foreground">
                      <span className="text-xs font-medium">Most Positive</span>
                      <p className="text-xs mt-2">Awaiting reaction data...</p>
                    </div>
                  )}

                  {biggest ? (
                    <button
                      onClick={() => seek(biggest.timestamp)}
                      className="card-surface p-4 text-left transition-shadow hover:shadow-pop rounded-2xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-notable-soft text-lg">
                          😮
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          Biggest Reaction
                        </span>
                      </div>
                      <p className="mt-3 font-display text-2xl font-semibold">
                        {formatTime(biggest.timestamp)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {biggest.type} (intensity: {biggest.intensity.toFixed(2)})
                      </p>
                    </button>
                  ) : (
                    <div className="card-surface p-4 rounded-2xl text-left text-muted-foreground">
                      <span className="text-xs font-medium">Biggest Reaction</span>
                      <p className="text-xs mt-2">Awaiting reaction data...</p>
                    </div>
                  )}

                  {negativeShift ? (
                    <button
                      onClick={() => seek(negativeShift.timestamp)}
                      className="card-surface p-4 text-left transition-shadow hover:shadow-pop rounded-2xl"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-negative-soft text-lg">
                          😕
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          Negative Shift
                        </span>
                      </div>
                      <p className="mt-3 font-display text-2xl font-semibold">
                        {formatTime(negativeShift.timestamp)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        From {negativeShift.from_type} (delta: {negativeShift.delta.toFixed(2)})
                      </p>
                    </button>
                  ) : (
                    <div className="card-surface p-4 rounded-2xl text-left text-muted-foreground">
                      <span className="text-xs font-medium">Negative Shift</span>
                      <p className="text-xs mt-2">None detected</p>
                    </div>
                  )}

                  <div className="card-surface p-4 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-info-soft text-primary">
                        <ListOrdered className="h-4 w-4" />
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        Top Moments to Review
                      </span>
                    </div>
                    {topMoments.length > 0 ? (
                      <ol className="mt-3 space-y-1.5 text-xs">
                        {topMoments.slice(0, 5).map((m, i) => (
                          <li key={m.timestamp}>
                            <button
                              onClick={() => seek(m.timestamp)}
                              className="flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-muted"
                            >
                              <span className="text-muted-foreground">{i + 1}.</span>
                              <span className="font-semibold tabular-nums">
                                {formatTime(m.timestamp)}
                              </span>
                              <span className="truncate text-muted-foreground">{m.type}</span>
                            </button>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-3">Awaiting data...</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: AI Agent Recommendations & Chatbot */}
          <div className="space-y-5">
            {/* Agent Recommendations */}
            <section className="card-surface p-5 rounded-2xl">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-base font-semibold">Agent Recommendations</h3>
                  <p className="text-xs text-muted-foreground">
                    Actionable advice generated from participant facial reactions
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                    Analyzing reactions...
                  </div>
                ) : topMoments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Recommendations will appear as viewers complete this test.
                  </p>
                ) : (
                  topMoments.slice(0, 3).map((m) => (
                    <button
                      key={m.timestamp}
                      onClick={() => seek(m.timestamp)}
                      className="flex w-full items-start gap-3 rounded-2xl bg-info-soft p-3.5 text-left transition-transform hover:-translate-y-0.5"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-card text-primary">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold">
                          Review at {formatTime(m.timestamp)}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          Notable {m.type} expression shift (intensity: {m.intensity.toFixed(2)})
                        </span>
                      </div>
                      <Arrow className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* AI Agent Chatbot */}
            <SessionAgentChat sessionId={sessionId} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
