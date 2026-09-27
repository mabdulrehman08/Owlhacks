import { useEffect, useRef, useState, type RefObject } from "react";

/** Live SmartSpectra readings for the HUD. `available` is null until the server answers. */
export type BreathingVitals = {
  available: boolean | null;
  breathingRate?: number | undefined;
  chestMotion?: number | undefined;
  hint?: string | undefined;
};

const WIDTH = 320;
const HEIGHT = 240;
const MIN_FRAME_MS = 33; // ~30 FPS at most
const UI_UPDATE_MS = 250; // HUD refresh; frames keep flowing faster

/**
 * Streams downscaled webcam frames to /api/vitals while `active`, one request at a
 * time, and reports breathing readings. If the server has no SmartSpectra key it
 * answers 503 and `available` becomes false, so callers can simply hide the HUD.
 *
 * `latestRate()` gives the most recent valid breaths-per-minute (for tagging
 * reactions) without waiting for a re-render.
 */
export function useBreathingVitals(
  camRef: RefObject<HTMLVideoElement | null>,
  active: boolean,
): BreathingVitals & { latestRate: () => number | undefined } {
  const [vitals, setVitals] = useState<BreathingVitals>({ available: null });
  const rateRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let sessionId: string | null = null;
    let raf = 0;
    let sending = false;
    let lastSent = 0;
    let lastUi = 0;
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const pump = () => {
      raf = requestAnimationFrame(pump);
      const cam = camRef.current;
      if (!sessionId || !ctx || !cam || cam.readyState < 2 || sending) return;
      const now = performance.now();
      if (now - lastSent < MIN_FRAME_MS) return;
      lastSent = now;
      sending = true;

      ctx.drawImage(cam, 0, 0, WIDTH, HEIGHT);
      const pixels = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
      fetch(
        `/api/vitals/frame?sessionId=${sessionId}&width=${WIDTH}&height=${HEIGHT}&t=${now.toFixed(1)}`,
        {
          method: "POST",
          headers: { "content-type": "application/octet-stream" },
          body: pixels,
        },
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          if (data.failed) {
            // The server gave up (e.g. rejected API key): stop streaming frames.
            cancelAnimationFrame(raf);
            if (sessionId) navigator.sendBeacon(`/api/vitals/stop?sessionId=${sessionId}`);
            sessionId = null;
            setVitals({ available: true, hint: data.validation?.hint });
            return;
          }
          const rate = data.vitals?.breathingRate;
          if (typeof rate === "number" && rate > 0) rateRef.current = rate;
          const t = performance.now();
          if (t - lastUi < UI_UPDATE_MS) return;
          lastUi = t;
          setVitals({
            available: true,
            breathingRate: rateRef.current,
            chestMotion: data.vitals?.chestMotion,
            hint: data.validation?.hint,
          });
        })
        .catch(() => {
          // a dropped frame is fine; the next one follows
        })
        .finally(() => {
          sending = false;
        });
    };

    fetch("/api/vitals/start", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.sessionId) {
          if (!cancelled) setVitals({ available: false });
          return;
        }
        if (cancelled) {
          navigator.sendBeacon(`/api/vitals/stop?sessionId=${data.sessionId}`);
          return;
        }
        sessionId = data.sessionId;
        setVitals({ available: true, hint: "Warming up…" });
        raf = requestAnimationFrame(pump);
      })
      .catch(() => {
        if (!cancelled) setVitals({ available: false });
      });

    // Also stop the server session if the tab is closed mid-measurement.
    const onUnload = () => {
      if (sessionId) navigator.sendBeacon(`/api/vitals/stop?sessionId=${sessionId}`);
    };
    window.addEventListener("pagehide", onUnload);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pagehide", onUnload);
      onUnload();
      rateRef.current = undefined;
    };
  }, [active, camRef]);

  return { ...vitals, latestRate: () => rateRef.current };
}

/** Friendly wording for the SDK's positioning hints. */
export function vitalsHintLabel(hint: string | undefined): string | undefined {
  if (!hint || /^(valid|ok)$/i.test(hint.trim())) return undefined;
  return hint.replace(/\.$/, "");
}
