import { MARKERS, REACTION_META, SERIES, VIDEO_DURATION, formatTime } from "@/lib/reaction-data";

const W = 1000;
const H = 200;
const PAD_T = 16;
const PAD_B = 26;

function y(v: number) {
  const max = 4.2;
  return PAD_T + (1 - v / max) * (H - PAD_T - PAD_B);
}
function x(t: number) {
  return (t / VIDEO_DURATION) * W;
}

export function ReactionTimeline({
  currentTime,
  onSeek,
}: {
  currentTime: number;
  onSeek: (t: number) => void;
}) {
  const line = SERIES.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `M0,${H - PAD_B} L${line.replaceAll(" ", " L")} L${W},${H - PAD_B} Z`;
  const ticks = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270];

  return (
    <div className="select-none">
      <div className="relative pl-9">
        {/* emoji markers */}
        <div className="relative mb-1 h-14">
          {MARKERS.map((m) => (
            <button
              key={m.t}
              type="button"
              onClick={() => onSeek(m.t)}
              title={`${REACTION_META[m.kind].label} — ${m.label}`}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-1 transition-transform hover:scale-110 focus:outline-none focus-visible:scale-110"
              style={{ left: `${(m.t / VIDEO_DURATION) * 100}%` }}
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card text-lg shadow-card"
                data-tone={REACTION_META[m.kind].tone}
              >
                {REACTION_META[m.kind].emoji}
              </span>
              <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground">
                {formatTime(m.t)}
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
            onSeek(((e.clientX - rect.left) / rect.width) * VIDEO_DURATION);
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
          {MARKERS.map((m) => {
            const p = SERIES.reduce((best, c) =>
              Math.abs(c.t - m.t) < Math.abs(best.t - m.t) ? c : best,
            );
            return (
              <g key={m.t}>
                <line
                  x1={x(m.t)}
                  x2={x(m.t)}
                  y1={y(p.v)}
                  y2={H - PAD_B}
                  stroke="var(--primary)"
                  strokeDasharray="4 4"
                  strokeOpacity="0.5"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={x(m.t)} cy={y(p.v)} r="5" fill="var(--primary)" />
              </g>
            );
          })}
          <line
            x1={x(currentTime)}
            x2={x(currentTime)}
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
