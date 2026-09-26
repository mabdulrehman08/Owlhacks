export type ReactionKind = "happy" | "surprise" | "confusion" | "neutral" | "attention";

export const REACTION_META: Record<ReactionKind, { emoji: string; label: string; tone: string }> = {
  happy: { emoji: "😄", label: "Smile", tone: "positive" },
  surprise: { emoji: "😮", label: "Surprise", tone: "notable" },
  confusion: { emoji: "😕", label: "Confusion", tone: "negative" },
  neutral: { emoji: "😐", label: "Neutral", tone: "neutral" },
  attention: { emoji: "👀", label: "Attention shift", tone: "neutral" },
};

export const VIDEO_DURATION = 272; // 4:32

export const VIDEO_SRC =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type Marker = {
  t: number;
  kind: ReactionKind;
  intensity: number;
  label: string;
  note: string;
};

export const MARKERS: Marker[] = [
  {
    t: 94,
    kind: "happy",
    intensity: 3.1,
    label: "Value proposition",
    note: "Clear positive reaction to the value proposition.",
  },
  {
    t: 127,
    kind: "surprise",
    intensity: 3.8,
    label: "Pricing reveal",
    note: "Strong surprise response to the pricing reveal.",
  },
  {
    t: 192,
    kind: "confusion",
    intensity: 2.6,
    label: "Signup friction",
    note: "Noticeable drop in positive expressions, possible confusion.",
  },
  {
    t: 226,
    kind: "neutral",
    intensity: 1.9,
    label: "Plan comparison",
    note: "Attention drifts, expression flattens out.",
  },
  {
    t: 28,
    kind: "attention",
    intensity: 1.6,
    label: "Initial impression",
    note: "Settling in, brief attention shift away from the screen.",
  },
];

/** Deterministic pseudo-random so the curve is stable between renders. */
function wobble(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

export type SeriesPoint = { t: number; v: number };

export const SERIES: SeriesPoint[] = (() => {
  const step = 2;
  const points: SeriesPoint[] = [];
  for (let t = 0; t <= VIDEO_DURATION; t += step) {
    let v = 1.5 + wobble(t) * 0.35;
    for (const m of MARKERS) {
      const d = (t - m.t) / 16;
      v += m.intensity * Math.exp(-d * d);
    }
    points.push({ t, v: Math.max(0.2, Math.min(4, v)) });
  }
  return points;
})();

export const SUMMARY = {
  mostPositive: MARKERS[0]!,
  biggest: MARKERS[1]!,
  negativeShift: MARKERS[2]!,
};

export const TOP_MOMENTS = [MARKERS[1]!, MARKERS[2]!, MARKERS[0]!, MARKERS[3]!, MARKERS[4]!];

export const RECOMMENDATIONS = [
  {
    tone: "info" as const,
    title: "Review pricing reveal",
    body: "Strong surprise at 2:07 suggests the pricing may be higher than expected. Consider adding more context or value before showing the price.",
    t: 127,
  },
  {
    tone: "warn" as const,
    title: "Inspect signup friction",
    body: "Negative shift at 3:12 indicates possible confusion during the signup step. Simplify the form or add clearer guidance.",
    t: 192,
  },
  {
    tone: "good" as const,
    title: "Keep feature reveal",
    body: "Positive reaction at 1:34 shows strong engagement with the core value proposition. Keep this section and consider making it even more prominent.",
    t: 94,
  },
];

export type Participant = {
  id: string;
  name: string;
  initials: string;
  top: ReactionKind;
  moments: number;
  tags: string[];
  duration: string;
};

export const PARTICIPANTS: Participant[] = [
  { id: "P1", name: "Jessica Davis", initials: "JD", top: "surprise", moments: 3, tags: ["Pricing reveal", "Signup friction"], duration: "4:12" },
  { id: "P2", name: "Marcus Kim", initials: "MK", top: "happy", moments: 2, tags: ["Value prop", "Plan comparison"], duration: "3:48" },
  { id: "P3", name: "Aisha Singh", initials: "AS", top: "confusion", moments: 4, tags: ["Signup friction", "Form fields"], duration: "5:21" },
  { id: "P4", name: "Tyler Brooks", initials: "TB", top: "surprise", moments: 3, tags: ["Pricing reveal", "Plan comparison"], duration: "4:03" },
  { id: "P5", name: "Emily Chen", initials: "EC", top: "neutral", moments: 2, tags: ["Value prop", "Initial impression"], duration: "3:57" },
  { id: "P6", name: "Daniel Ross", initials: "DR", top: "confusion", moments: 3, tags: ["Signup friction", "Pricing reveal"], duration: "4:36" },
  { id: "P7", name: "Sophia Patel", initials: "SP", top: "happy", moments: 2, tags: ["Value prop", "Plan comparison"], duration: "3:29" },
  { id: "P8", name: "Lucas Wright", initials: "LW", top: "surprise", moments: 3, tags: ["Pricing reveal", "Form fields"], duration: "4:11" },
];

export const SESSION_AVERAGES = [2.1, 2.3, 3.2, 2.7, 2.2, 2.0, 2.4, 2.9];

export const COMMON_MOMENTS = [
  { label: "Pricing reveal", pct: 75, count: "6/8", kind: "surprise" as ReactionKind },
  { label: "Signup friction", pct: 62, count: "5/8", kind: "confusion" as ReactionKind },
  { label: "Value proposition", pct: 50, count: "4/8", kind: "happy" as ReactionKind },
  { label: "Plan comparison", pct: 38, count: "3/8", kind: "confusion" as ReactionKind },
  { label: "Initial impression", pct: 25, count: "2/8", kind: "neutral" as ReactionKind },
];

export const STUDY_INSIGHTS = [
  {
    tone: "info" as const,
    title: "Pricing reveal consistently caused surprise.",
    body: "6 of 8 participants showed a strong surprise reaction when the pricing was revealed, with an average intensity of 3.4 at this moment.",
  },
  {
    tone: "warn" as const,
    title: "Signup flow caused confusion for 6 of 8 participants.",
    body: "Participants showed notable confusion during the signup step, particularly around required fields and plan selection.",
  },
  {
    tone: "good" as const,
    title: "Value proposition drove positive engagement.",
    body: "5 of 8 participants showed positive reactions when the value proposition was introduced, with smiles and increased attention.",
  },
];

export const AGENT_REPLIES: { q: string; a: string }[] = [
  {
    q: "What did the user like most?",
    a: "The user had the strongest positive reaction at 1:34, when the value proposition and key benefits were introduced. They smiled and showed increased engagement.",
  },
  {
    q: "Where did they seem confused?",
    a: "There was a noticeable negative shift at 3:12, during the signup step. The user looked confused, with a slight frown and narrowed eyes, which often indicates uncertainty.",
  },
  {
    q: "Which moments should I review first?",
    a: "Start with 2:07 (pricing reveal, biggest reaction), then 3:12 (signup friction) and 1:34 (value proposition). Those three account for most of the notable expression changes in this session.",
  },
];
