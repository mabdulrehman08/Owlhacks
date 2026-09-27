import type { Reaction } from "@/lib/api";
import { emotionMeta, TONE_STYLES } from "@/lib/emotions";
import { formatTime } from "@/lib/reaction-data";

/**
 * A horizontal bar across the whole video, colored by the viewer's emotion over time.
 * Each reaction colors the bar from its timestamp until the next one; stronger
 * reactions are more saturated.
 */
export function EmotionStrip({
  reactions,
  duration,
  currentTime,
  onSeek,
  className = "h-3",
}: {
  reactions: Reaction[];
  duration: number;
  currentTime?: number;
  onSeek?: (t: number) => void;
  className?: string;
}) {
  const sorted = [...reactions].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-full bg-muted ${className} ${onSeek ? "cursor-pointer" : ""}`}
      onClick={(e) => {
        if (!onSeek) return;
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek(((e.clientX - rect.left) / rect.width) * duration);
      }}
    >
      {sorted.map((r, i) => {
        const next = sorted[i + 1];
        const end = next ? next.timestamp : Math.min(duration, r.timestamp + 8);
        const meta = emotionMeta(r.type);
        return (
          <span
            key={r.id}
            title={`${formatTime(r.timestamp)} · ${meta.label} (${r.intensity.toFixed(2)})`}
            className="absolute inset-y-0"
            style={{
              left: `${(r.timestamp / duration) * 100}%`,
              width: `${Math.max(0.6, ((end - r.timestamp) / duration) * 100)}%`,
              backgroundColor: TONE_STYLES[meta.tone].color,
              opacity: 0.3 + 0.7 * Math.min(1, r.intensity),
            }}
          />
        );
      })}
      {currentTime !== undefined && (
        <span
          className="absolute inset-y-0 w-0.5 bg-foreground"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      )}
    </div>
  );
}

export function EmotionLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {(
        [
          ["positive", "Positive"],
          ["notable", "Surprise"],
          ["negative", "Negative"],
          ["neutral", "Neutral"],
        ] as const
      ).map(([tone, label]) => (
        <span key={tone} className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${TONE_STYLES[tone].bar}`} />
          {label}
        </span>
      ))}
    </div>
  );
}
