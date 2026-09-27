/**
 * Facial-expression classifier built on MediaPipe FaceLandmarker blendshapes.
 *
 * Each reaction is a weighted mix of the blendshapes that make up that expression,
 * measured relative to the viewer's own resting face (see ExpressionTracker), then
 * smoothed over time so a single frame or blink doesn't flip the label.
 * Labels match the backend's VALENCE table (backend/services/analytics.py).
 */

export type ExpressionKey =
  | "joy"
  | "amusement"
  | "surprise"
  | "confusion"
  | "frustration"
  | "sadness"
  | "disgust"
  | "boredom";

export type ExpressionScores = Record<ExpressionKey, number>;

type BlendshapeCategory = { categoryName: string; score: number };

export const EXPRESSIONS: { key: ExpressionKey; label: string; emoji: string; color: string }[] = [
  { key: "joy", label: "Joy", emoji: "😄", color: "var(--emotion-joy)" },
  { key: "amusement", label: "Amusement", emoji: "😂", color: "var(--notable)" },
  { key: "surprise", label: "Surprise", emoji: "😮", color: "var(--emotion-surprise)" },
  { key: "confusion", label: "Confusion", emoji: "😕", color: "var(--emotion-fear)" },
  { key: "frustration", label: "Frustration", emoji: "😤", color: "var(--emotion-anger)" },
  { key: "sadness", label: "Sadness", emoji: "😢", color: "var(--emotion-sadness)" },
  { key: "disgust", label: "Disgust", emoji: "🤢", color: "var(--emotion-disgust)" },
  { key: "boredom", label: "Boredom", emoji: "🥱", color: "var(--emotion-neutral)" },
];

export const EXPRESSION_META = Object.fromEntries(EXPRESSIONS.map((e) => [e.key, e])) as Record<
  ExpressionKey,
  (typeof EXPRESSIONS)[number]
>;

/** Score (0-100) the top expression must reach to count as a reaction instead of neutral. */
export const REACTION_THRESHOLD = 30;

export function emptyScores(): ExpressionScores {
  return {
    joy: 0,
    amusement: 0,
    surprise: 0,
    confusion: 0,
    frustration: 0,
    sadness: 0,
    disgust: 0,
    boredom: 0,
  };
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Raw per-frame scores (0-1) from blendshapes. `get` returns a blendshape's
 * activation above the viewer's resting level.
 */
function classify(get: (name: string) => number, raw: (name: string) => number): ExpressionScores {
  const avg = (a: string, b: string) => (get(a) + get(b)) / 2;

  const smile = avg("mouthSmileLeft", "mouthSmileRight");
  const cheek = avg("cheekSquintLeft", "cheekSquintRight");
  const jaw = get("jawOpen");
  const browDown = avg("browDownLeft", "browDownRight");
  const browInnerUp = get("browInnerUp");
  const browOuterUp = avg("browOuterUpLeft", "browOuterUpRight");
  // One eyebrow up and the other not: the classic "huh?" look.
  const browAsym =
    Math.abs(raw("browOuterUpLeft") - raw("browOuterUpRight")) +
    Math.abs(raw("browDownLeft") - raw("browDownRight")) * 0.5;
  const eyeWide = avg("eyeWideLeft", "eyeWideRight");
  const squint = avg("eyeSquintLeft", "eyeSquintRight");
  const frown = avg("mouthFrownLeft", "mouthFrownRight");
  const press = avg("mouthPressLeft", "mouthPressRight");
  const sneer = avg("noseSneerLeft", "noseSneerRight");
  const upperLip = avg("mouthUpperUpLeft", "mouthUpperUpRight");
  const pucker = get("mouthPucker");
  const lipsAside = Math.max(get("mouthLeft"), get("mouthRight"));
  const chinUp = get("mouthShrugLower");
  // Raw (not baseline-relative): eyelids are either open or not.
  const lids = (raw("eyeBlinkLeft") + raw("eyeBlinkRight")) / 2;

  const notSmiling = 1 - clamp01(smile * 1.6);

  const joy = clamp01((smile * 1.15 + cheek * 0.25) * (1 - clamp01(jaw * 1.4) * 0.5));
  const amusement = clamp01(smile * jaw * 3.2);
  const surprise = clamp01(
    (eyeWide * 0.45 + Math.max(browInnerUp, browOuterUp) * 0.45 + jaw * 0.25) * 1.3 * notSmiling,
  );
  const confusion = clamp01(
    (browDown * 0.5 +
      squint * 0.3 +
      browAsym * 0.9 +
      Math.max(pucker * 0.6, lipsAside * 0.8, press * 0.3) -
      sneer * 0.5) *
      1.5 *
      notSmiling,
  );
  const frustration = clamp01(
    (browDown * 0.45 + press * 0.4 + sneer * 0.5) * 1.5 * notSmiling * clamp01((press + sneer) * 4),
  );
  const sadness = clamp01(
    (frown * 0.65 + browInnerUp * 0.35 * (1 - browOuterUp) + chinUp * 0.25) * 1.7 * notSmiling,
  );
  const disgust = clamp01((sneer * 0.6 + upperLip * 0.45) * 1.6 * notSmiling);
  // Yawning (mouth wide + eyes closing) or drooping, half-closed eyelids.
  const drowsy = lids > 0.3 && lids < 0.85 ? (lids - 0.3) * 1.4 : 0;
  const boredom = clamp01(Math.max(jaw * lids * 2.2, drowsy) * notSmiling);

  return { joy, amusement, surprise, confusion, frustration, sadness, disgust, boredom };
}

/**
 * Stateful per-viewer tracker: learns the resting face while calibrating, then
 * scores expressions relative to it with exponential smoothing.
 */
export class ExpressionTracker {
  private baseline = new Map<string, number>();
  private baselineFrames = 0;
  private smoothed = emptyScores();

  /** Fold a frame into the resting-face baseline (call while the viewer is idle). */
  calibrate(categories: BlendshapeCategory[]) {
    const rate = this.baselineFrames < 30 ? 1 / (this.baselineFrames + 1) : 0.03;
    for (const { categoryName, score } of categories) {
      const prev = this.baseline.get(categoryName) ?? score;
      this.baseline.set(categoryName, prev + (score - prev) * rate);
    }
    this.baselineFrames++;
  }

  get isCalibrated() {
    return this.baselineFrames >= 30;
  }

  /** Smoothed 0-100 scores for this frame. */
  update(categories: BlendshapeCategory[]): ExpressionScores {
    const rawMap = new Map(categories.map((c) => [c.categoryName, c.score]));
    const raw = (name: string) => rawMap.get(name) ?? 0;
    const get = (name: string) => {
      // Cap the baseline so a strong resting expression can't hide real movement.
      const b = Math.min(this.baseline.get(name) ?? 0, 0.5);
      return clamp01((raw(name) - b) / (1 - b));
    };

    const frame = classify(get, raw);
    for (const e of EXPRESSIONS) {
      // Rise quickly, fall a little slower, so short reactions still register.
      const alpha = frame[e.key] > this.smoothed[e.key] ? 0.45 : 0.25;
      this.smoothed[e.key] += (frame[e.key] - this.smoothed[e.key]) * alpha;
    }

    const out = emptyScores();
    for (const e of EXPRESSIONS) out[e.key] = Math.round(this.smoothed[e.key] * 100);
    return out;
  }

  reset() {
    this.smoothed = emptyScores();
  }
}

/** Strongest expression, or neutral when nothing clears the threshold. */
export function dominantExpression(scores: ExpressionScores): {
  type: ExpressionKey | "neutral";
  score: number;
} {
  let best: { type: ExpressionKey | "neutral"; score: number } = { type: "neutral", score: 0 };
  for (const e of EXPRESSIONS) {
    if (scores[e.key] > best.score) best = { type: e.key, score: scores[e.key] };
  }
  return best.score >= REACTION_THRESHOLD ? best : { type: "neutral", score: best.score };
}
