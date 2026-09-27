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
  return (t / duration) * W;
}

// Build a smooth curve from discrete reaction points
function buildSeries(reactions: Reaction[], duration: number) {
  const step = 2;
  const points: { t: number; v: number }[] = [];

  for (let t = 0; t <= duration; t += step) {
    let v = 1.5;

    // Add gaussian peaks around reaction timestamps
    for (const r of reactions) {
      const d = (t - r.timestamp) / 8;
      v += r.intensity * 2 * Math.exp(-d * d);
    }

    points.push({ t, v: Math.max(0.2, Math.min(4, v)) });
  }

  return points;
}

// Get the most significant reactions as markers
function getMarkers(reactions: Reaction[]) {
  return reactions
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 5)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// Emoji for each reaction type
const emojiForType: Record<string, string> = {
  joy: "😄",
  happy: "😄",
  smile: "😄",
  surprise: "😮",
  confusion: "😕",
  confused: "😕",
  neutral: "😐",
  attention: "👀",
  engagement: "👀",
};

export function ReactionTimeline({
  sessionId,
  currentTime,
  onSeek,
}: {
  sessionId: string;
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState(270);

  useEffect(() => {
    setLoading(true);
    getReactions(sessionId)
      .then((r) => {
        setReactions(r);
        if (r.length > 0) {
          setDuration(Math.max(270, Math.ceil(Math.max(...r.map((x) => x.timestamp)) + 10)));
        }
      })
      .catch((err) => console.error("Failed to load reactions:", err))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">Loading timeline...</div>;
  }

  const markers = getMarkers(reactions);
  const series = buildSeries(reactions, duration);
  const ticks = [];
  for (let t = 0; t <= duration; t += 30) ticks.push(t);

  const line = series.map((p) => `${x(p.t, duration).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `M0,${H - PAD_B} L${line.replaceAll(" ", " L")} L${W},${H - PAD_B} Z`;

  return (
    <div className="select-none">
      <div className="relative pl-9">
        {/* emoji markers */}
        <div className="relative mb-1 h-14">
          {markers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSeek(m.timestamp)}
              title={`${m.type} — intensity: ${m.intensity.toFixed(2)}`}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1 transition-transform hover:scale-110 focus:outline-none focus-visible:scale-110"
              style={{ left: `${(m.timestamp / duration) * 100}%` }}
            >
              <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-lg shadow-card">
                {emojiForType[m.type.toLowerCase()] || "😐"}
              </span>
              <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                {formatTime(m.timestamp)}
              </span>
            </button>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-52 w-full cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            onSeek(((e.clientX - rect.left) / rect.width) * duration);
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
              Math.abs(c.t - m.timestamp) < Math.abs(best.t - m.timestamp) ? c : best,
            );
            return (
              <g key={m.id}>
                <line
                  x1={x(m.timestamp, duration)}
                  x2={x(m.timestamp, duration)}
                  y1={y(p.v)}
                  y2={H - PAD_B}
                  stroke="var(--primary)"
                  strokeDasharray="4 4"
                  strokeOpacity="0.5"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={x(m.timestamp, duration)} cy={y(p.v)} r="5" fill="var(--primary)" />
              </g>
            );
          })}
          <line
            x1={x(currentTime, duration)}
            x2={x(currentTime, duration)}
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

      <div className="flex justify-between px-1 text-[10px] font-medium text-muted-foreground">
        {ticks.map((t) => (
          <span key={t}>{formatTime(t)}</span>
        ))}
      </div>
    </div>
  );
}
