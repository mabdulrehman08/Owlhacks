import type { Reaction } from "@/lib/api";

/** How an emotion reads for the video creator: good, attention-grabbing, bad, or flat. */
export type Tone = "positive" | "notable" | "negative" | "neutral";

type EmotionMeta = { emoji: string; label: string; tone: Tone };

// Covers every label the backend understands; unknown labels fall back to neutral.
const EMOTIONS: Record<string, EmotionMeta> = {
  joy: { emoji: "😄", label: "Joy", tone: "positive" },
  happy: { emoji: "😄", label: "Happy", tone: "positive" },
  happiness: { emoji: "😄", label: "Happiness", tone: "positive" },
  smile: { emoji: "😄", label: "Smile", tone: "positive" },
  amusement: { emoji: "😂", label: "Amusement", tone: "positive" },
  excitement: { emoji: "🤩", label: "Excitement", tone: "positive" },
  interest: { emoji: "🧐", label: "Interest", tone: "positive" },
  surprise: { emoji: "😮", label: "Surprise", tone: "notable" },
  confusion: { emoji: "😕", label: "Confusion", tone: "negative" },
  confused: { emoji: "😕", label: "Confusion", tone: "negative" },
  boredom: { emoji: "🥱", label: "Boredom", tone: "negative" },
  sadness: { emoji: "😢", label: "Sadness", tone: "negative" },
  frustration: { emoji: "😤", label: "Frustration", tone: "negative" },
  anger: { emoji: "😠", label: "Anger", tone: "negative" },
  disgust: { emoji: "🤢", label: "Disgust", tone: "negative" },
  fear: { emoji: "😨", label: "Fear", tone: "negative" },
  neutral: { emoji: "😐", label: "Neutral", tone: "neutral" },
  attention: { emoji: "👀", label: "Attention shift", tone: "neutral" },
};

export function emotionMeta(type: string | undefined | null): EmotionMeta {
  const key = (type ?? "").toLowerCase();
  const known = EMOTIONS[key];
  if (known) return known;
  const label = key ? key.charAt(0).toUpperCase() + key.slice(1) : "Unknown";
  return { emoji: "🙂", label, tone: "neutral" };
}

// Literal class names so Tailwind generates them.
export const TONE_STYLES: Record<Tone, { color: string; soft: string; text: string; bar: string }> =
  {
    positive: {
      color: "var(--positive)",
      soft: "bg-positive-soft",
      text: "text-positive",
      bar: "bg-positive",
    },
    notable: {
      color: "var(--notable)",
      soft: "bg-notable-soft",
      text: "text-notable-text",
      bar: "bg-notable",
    },
    negative: {
      color: "var(--negative)",
      soft: "bg-negative-soft",
      text: "text-negative",
      bar: "bg-negative",
    },
    neutral: {
      color: "var(--muted-foreground)",
      soft: "bg-muted",
      text: "text-muted-foreground",
      bar: "bg-muted-foreground",
    },
  };

/** Backend sentiment (-1..1) as a 0-100 score. */
export function moodScore(sentiment: number): number {
  return Math.round((Math.max(-1, Math.min(1, sentiment)) + 1) * 50);
}

export function moodTone(sentiment: number): Tone {
  if (sentiment > 0.15) return "positive";
  if (sentiment < -0.15) return "negative";
  return "neutral";
}

export function moodLabel(sentiment: number): string {
  if (sentiment > 0.4) return "Very positive";
  if (sentiment > 0.15) return "Positive";
  if (sentiment >= -0.15) return "Mixed";
  if (sentiment >= -0.4) return "Negative";
  return "Very negative";
}

/** Same length ReactionTimeline uses, so strips and timelines line up. */
export function timelineDuration(reactions: Reaction[]): number {
  if (reactions.length === 0) return 270;
  return Math.max(270, Math.ceil(Math.max(...reactions.map((r) => r.timestamp)) + 10));
}

/**
 * How long one reaction can color the timeline: a bit more than the usual gap
 * between samples. Longer gaps mean nobody was watching, so they stay empty.
 */
export function reactionReach(reactions: Reaction[]): number {
  const ts = reactions.map((r) => r.timestamp).sort((a, b) => a - b);
  const gaps = ts
    .slice(1)
    .map((t, i) => t - (ts[i] ?? t))
    .filter((g) => g > 0)
    .sort((a, b) => a - b);
  const median = gaps.length ? (gaps[Math.floor(gaps.length / 2)] ?? 1) : 1;
  return Math.max(0.5, median * 1.5);
}

/** Seconds of the video covered by at least one viewer's reactions. */
export function watchedSeconds(reactions: Reaction[], duration: number, reach: number): number {
  const ts = reactions.map((r) => r.timestamp).sort((a, b) => a - b);
  let total = 0;
  ts.forEach((t, i) => {
    const next = ts[i + 1] ?? Infinity;
    total += Math.max(0, Math.min(next, t + reach, duration) - t);
  });
  return Math.min(total, duration);
}
