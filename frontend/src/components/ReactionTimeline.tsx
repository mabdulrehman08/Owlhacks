import { useEffect, useState } from "react";
import { getReactions, type Reaction } from "@/lib/api";
import { formatTime } from "@/lib/reaction-data";

const W = 1000;
const H = 200;
const PAD_T = 16;
const PAD_B = 26;

function y(v: number) {
  const max = 4.2;
  return PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);
}
function x(t: number, duration: number) {
  return duration > 0 ? (t / duration) * W : 0;
}

// Build a smooth curve from discrete reaction points
function buildSeries(reactions: Reaction[], duration: number) {
  const safeDuration = Math.max(1, duration);
  const step = Math.max(0.15, safeDuration / 180);
  const sigma = Math.max(0.7, Math.min(5.0, safeDuration / 28));
  const points: { t: number; v: number }[] = [];

  for (let t = 0; t <= safeDuration; t += step) {
    let v = 1.2;

    // Add gaussian peaks around reaction timestamps
    for (const r of reactions) {
      const d = (t - r.timestamp) / sigma;
      v += r.intensity * 2.2 * Math.exp(-d * d);
    }

    points.push({ t, v: Math.max(0.2, Math.min(4.0, v)) });
  }

  // Ensure last point is at safeDuration
  const lastPoint = points.length > 0 ? points[points.length - 1] : undefined;
  if (lastPoint && lastPoint.t < safeDuration) {
    let v = 1.2;
    for (const r of reactions) {
      const d = (safeDuration - r.timestamp) / sigma;
      v += r.intensity * 2.2 * Math.exp(-d * d);
    }
    points.push({ t: safeDuration, v: Math.max(0.2, Math.min(4.0, v)) });
  }

  return points;
}

// Get the most significant reactions as markers
function getMarkers(reactions: Reaction[]) {
  const emotive = reactions.filter((r) => r.type.toLowerCase() !== "neutral");
  const pool = emotive.length >= 3 ? emotive : reactions;

  return pool
    .slice()
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 6)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Emoji for each reaction type
const emojiForType: Record<string, string> = {
  joy: "😄",
  happy: "😄",
  happiness: "😄",
  smile: "😄",
  surprise: "😮",
  surprised: "😮",
  confusion: "😕",
  confused: "😕",
  frustration: "😠",
  anger: "😠",
  sadness: "😢",
  sad: "😢",
  interest: "🧐",
  neutral: "😐",
  attention: "👀",
  engagement: "👀",
  boredom: "🥱",
};

export function ReactionTimeline({
  sessionId,
  currentTime,
  onSeek,
  videoDuration,
}: {
  sessionId: string;
  currentTime: number;
  onSeek: (t: number) => void;
  videoDuration?: number;
}) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getReactions(sessionId)
      .then((r) => {
        setReactions(r);
      })
      .catch((err) => console.error("Failed to load reactions:", err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
        Loading timeline...
      </div>
    );
  }

  // Calculate effective timeline duration
  const maxReactionTime = reactions.length > 0 ? Math.max(...reactions.map((x) => x.timestamp)) : 0;
  const effectiveDuration = Math.max(
    videoDuration && videoDuration > 0 ? videoDuration : 0,
    maxReactionTime > 0 ? Math.ceil(maxReactionTime + 1) : 0,
    sessionId === "demo" ? 270 : 15
  );

  const markers = getMarkers(reactions);
  const series = buildSeries(reactions, effectiveDuration);

  // Dynamic tick step according to duration
  const tickStep =
    effectiveDuration <= 15
      ? 2
      : effectiveDuration <= 30
      ? 5
      : effectiveDuration <= 90
      ? 10
      : effectiveDuration <= 180
      ? 20
      : effectiveDuration <= 360
      ? 30
      : 60;

  const ticks: number[] = [];
  for (let t = 0; t <= effectiveDuration; t += tickStep) {
    ticks.push(t);
  }
  const lastTick = ticks.length > 0 ? ticks[ticks.length - 1] : undefined;
  if (lastTick !== undefined && effectiveDuration - lastTick > tickStep * 0.4) {
    ticks.push(Math.round(effectiveDuration));
  }

  const line = series.map((p) => `${x(p.t, effectiveDuration).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `M0,${H - PAD_B} L${line.replaceAll(" ", " L")} L${W},${H - PAD_B} Z`;

  return (
    <div className="select-none">
      <div className="relative pl-9">
        {/* Emoji markers */}
        <div className="relative mb-1 h-14">
          {markers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSeek(m.timestamp)}
              title={`${m.type} — intensity: ${(m.intensity * 100).toFixed(0)}% at ${formatTime(m.timestamp)}`}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1 transition-transform hover:scale-110 focus:outline-none focus-visible:scale-110 cursor-pointer z-10"
              style={{ left: `${(m.timestamp / effectiveDuration) * 100}%` }}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-base shadow-card">
                {emojiForType[m.type.toLowerCase()] || "😐"}
              </span>
              <span className="rounded-md bg-notable-soft px-1.5 py-0.5 font-mono text-[9px] font-semibold text-notable-text">
                {formatTime(m.timestamp)}
              </span>
            </button>
          ))}

          {reactions.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/80 italic">
              Awaiting reactions from participants — take the test to record live facial expressions
            </div>
          )}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-52 w-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(((e.clientX - rect.left) / rect.width) * effectiveDuration);
          }}
        >
          <defs>
            <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[1, 2, 3, 4].map((g) => (
            <line
              key={g}
              x1="0"
              x2={W}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--border)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={area} fill="url(#fill)" />
          <polyline
            points={line}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
          {markers.map((m) => {
            const p = series.reduce((best, c) =>
              Math.abs(c.t - m.timestamp) < Math.abs(best.t - m.timestamp) ? c : best
            );
            return (
              <g key={m.id}>
                <line
                  x1={x(m.timestamp, effectiveDuration)}
                  x2={x(m.timestamp, effectiveDuration)}
                  y1={y(p.v)}
                  y2={H - PAD_B}
                  stroke="var(--notable)"
                  strokeDasharray="4 4"
                  strokeOpacity="0.5"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={x(m.timestamp, effectiveDuration)}
                  cy={y(p.v)}
                  r="5"
                  fill="var(--notable)"
                  stroke="var(--card)"
                  strokeWidth="2"
                />
              </g>
            );
          })}
          <line
            x1={x(currentTime, effectiveDuration)}
            x2={x(currentTime, effectiveDuration)}
            y1={PAD_T - 8}
            y2={H - PAD_B}
            stroke="var(--foreground)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="pointer-events-none absolute left-0 top-14 flex h-52 flex-col justify-between py-2 text-[10px] font-medium text-muted-foreground">
          <span>High</span>
          <span>Neutral</span>
          <span>Low</span>
        </div>
      </div>

      <div className="flex justify-between px-1 font-mono text-[10px] text-muted-foreground">
        {ticks.map((t) => (
          <span key={t}>{formatTime(t)}</span>
        ))}
      </div>
    </div>
  );
}
