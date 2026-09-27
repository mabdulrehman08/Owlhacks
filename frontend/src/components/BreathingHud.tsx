import { vitalsHintLabel, type BreathingVitals } from "@/lib/use-breathing-vitals";

/** Breathing overlay for a webcam view. Renders nothing when vitals aren't available. */
export function BreathingHud({ vitals }: { vitals: BreathingVitals }) {
  if (!vitals.available) return null;
  const hint = vitalsHintLabel(vitals.hint);
  const rate = vitals.breathingRate;

  return (
    <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-black/75 px-2 py-1 text-[11px] font-semibold text-white">
          <span className="text-sm leading-none">🫁</span>
          {rate ? `${Math.round(rate)} breaths/min` : "Measuring breathing…"}
        </span>
        {vitals.chestMotion !== undefined && (
          <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-emerald-300">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400" />
            chest
          </span>
        )}
      </div>
      {hint && (
        <span className="rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-semibold text-black">
          {hint}
        </span>
      )}
      {!rate && !hint && (
        <span className="text-[10px] font-medium text-white/80 drop-shadow">
          First reading takes about 30 seconds
        </span>
      )}
    </div>
  );
}
