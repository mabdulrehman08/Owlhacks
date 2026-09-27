import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Send, Sparkles, Wrench } from "lucide-react";
import { EmotionLegend, EmotionStrip } from "@/components/EmotionStrip";
import {
  getInsights,
  getReactions,
  sendChatMessage,
  type ChatResponse,
  type Insights,
  type Reaction,
} from "@/lib/api";
import { emotionMeta, moodLabel, moodScore, moodTone, timelineDuration, TONE_STYLES } from "@/lib/emotions";
import { formatTime } from "@/lib/reaction-data";

const DEMO_SESSION = "demo";

const SUGGESTED = [
  "Where did the viewer get confused?",
  "What 3 moments should I review?",
  "Was the ending stronger than the beginning?",
];

/** Real demo-session data plus the real AI agent, embedded in the landing page. */
export function LiveDemo() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [offline, setOffline] = useState(false);

  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<ChatResponse | null>(null);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    Promise.all([getInsights(DEMO_SESSION), getReactions(DEMO_SESSION)])
      .then(([i, r]) => {
        setInsights(i);
        setReactions(r);
      })
      .catch(() => setOffline(true));
  }, []);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || thinking) return;
    setAsked(text);
    setQuestion("");
    setAnswer(null);
    setThinking(true);
    try {
      setAnswer(await sendChatMessage(DEMO_SESSION, text, []));
    } catch {
      setAnswer({ answer: "The agent is offline right now. Start the backend and try again.", timestamps: [], tools_used: [], mode: "fallback" });
    } finally {
      setThinking(false);
    }
  }

  const summary = insights?.summary;
  const sentiment = summary?.overall_sentiment ?? 0;
  const tone = moodTone(sentiment);
  const duration = timelineDuration(reactions);
  const highlights = [
    { label: "Most positive", m: insights?.most_positive, bg: "bg-positive-soft" },
    { label: "Biggest reaction", m: insights?.biggest_reaction, bg: "bg-notable-soft" },
    { label: "Lost them here", m: insights?.most_negative_shift, bg: "bg-negative-soft" },
  ];

  return (
    <section id="live-demo" className="border-t border-border py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Live demo</span>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Don't take our word for it. Ask the room.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            This is a real test session and the real AI agent, not a screenshot. Click a question and
            watch it answer from the reaction data.
          </p>
        </div>

        {offline ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            The live demo needs the backend running. Start it and refresh, or{" "}
            <Link to="/dashboard" className="font-semibold text-primary hover:underline">
              open the demo dashboard
            </Link>
            .
          </div>
        ) : (
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            {/* The session */}
            <div className="card-surface space-y-5 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Demo session · one viewer</p>
                  <p className="font-display text-lg font-semibold">How did they feel, second by second?</p>
                </div>
                {summary && (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${TONE_STYLES[tone].soft} ${TONE_STYLES[tone].text}`}>
                    Mood {moodScore(sentiment)}/100 · {moodLabel(sentiment)}
                  </span>
                )}
              </div>

              <div>
                {reactions.length ? (
                  <EmotionStrip reactions={reactions} duration={duration} className="h-6" />
                ) : (
                  <div className="h-6 animate-pulse rounded-full bg-muted" />
                )}
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground">0:00</span>
                  <EmotionLegend />
                  <span className="text-[10px] font-medium text-muted-foreground">{formatTime(duration)}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {highlights.map(({ label, m, bg }) => (
                  <div key={label} className={`rounded-xl p-3 ${bg}`}>
                    <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                    <p className="mt-1 font-display text-xl font-semibold">
                      {m ? formatTime(m.timestamp) : "–"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m ? `${emotionMeta(m.type).emoji} ${emotionMeta(m.type).label}` : "…"}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Open the full dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* The agent */}
            <div className="card-surface flex flex-col p-6">
              <p className="flex items-center gap-2 font-display text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-primary" /> Ask the agent
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTED.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void ask(q)}
                    disabled={thinking}
                    className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-left text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="mt-4 min-h-44 flex-1 rounded-xl bg-muted/50 p-4 text-sm">
                {!asked && (
                  <p className="text-muted-foreground">
                    Pick a question above, or type your own. Every answer is built from real reaction data
                    the agent looks up with its tools.
                  </p>
                )}
                {asked && <p className="font-semibold">“{asked}”</p>}
                {thinking && (
                  <p className="mt-3 flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Reading the room…
                  </p>
                )}
                {answer && (
                  <div className="mt-3 space-y-3">
                    <p className="whitespace-pre-line leading-relaxed">{answer.answer}</p>
                    {answer.tools_used.length > 0 && (
                      <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Wrench className="h-3 w-3" /> Looked up:
                        {[...new Set(answer.tools_used)].map((t) => (
                          <code key={t} className="rounded bg-card px-1.5 py-0.5">
                            {t}
                          </code>
                        ))}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask(question);
                }}
              >
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about the viewer's reactions…"
                  className="min-w-0 flex-1 rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
                <button
                  type="submit"
                  disabled={thinking || !question.trim()}
                  aria-label="Ask"
                  className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
