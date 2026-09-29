import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Camera,
  CameraOff,
  Check,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import { BreathingHud } from "@/components/BreathingHud";
import { EmotionStrip } from "@/components/EmotionStrip";
import { submitReactions, type Reaction, type Session } from "@/lib/api";
import {
  EXPRESSIONS,
  EXPRESSION_META,
  ExpressionTracker,
  dominantExpression,
  emptyScores,
  type ExpressionScores,
} from "@/lib/expressions";
import { emotionMeta } from "@/lib/emotions";
import { loadFaceLandmarker, type FaceLandmarkerLike } from "@/lib/face-landmarker";
import { formatTime } from "@/lib/reaction-data";
import { useBreathingVitals } from "@/lib/use-breathing-vitals";

type Phase = "idle" | "calibrating" | "ready" | "recording" | "saving" | "done" | "error";

/** Seconds of video between recorded samples (same cadence as the participant test). */
const SAMPLE_EVERY = 0.45;

/**
 * Watch a session's video with the webcam on and record facial reactions against
 * the video's timeline, then save them to the session. Only reaction labels leave
 * the browser; the camera feed is processed locally.
 */
export function ReactionRecorder({ session }: { session: Session }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const camRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarkerLike | null>(null);
  const trackerRef = useRef(new ExpressionTracker());
  const rafRef = useRef<number | null>(null);
  const lastFrameTsRef = useRef(0);
  const lastSampleRef = useRef(-1);
  const reactionsRef = useRef<Reaction[]>([]);
  const phaseRef = useRef<Phase>("idle");
  const savingRef = useRef(false);

  const [phase, setPhaseState] = useState<Phase>("idle");
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [scores, setScores] = useState<ExpressionScores>(emptyScores);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Breathing (SmartSpectra) runs whenever the camera is on; hidden if not configured.
  const cameraActive = phase === "calibrating" || phase === "ready" || phase === "recording";
  const vitals = useBreathingVitals(camRef, cameraActive);
  const latestRateRef = useRef(vitals.latestRate);
  latestRateRef.current = vitals.latestRate;

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  // Load the face model up front so the camera step is instant.
  useEffect(() => {
    let active = true;
    loadFaceLandmarker()
      .then((l) => {
        if (!active) return l.close?.();
        landmarkerRef.current = l;
        setModelReady(true);
      })
      .catch((err) => {
        console.error("Failed to load face tracker:", err);
        if (active) {
          setError("The face tracker couldn't load. Check your connection and reload the page.");
          setPhase("error");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (camRef.current) camRef.current.srcObject = null;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const save = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    videoRef.current?.pause();
    stopCamera();

    const taken = reactionsRef.current;
    if (taken.length === 0) {
      setError("We couldn't see a face while the video played, so nothing was recorded.");
      setPhase("error");
      return;
    }
    setPhase("saving");
    try {
      await submitReactions(
        session.id,
        taken.map(({ timestamp, type, intensity, confidence, breathing_rate }) => ({
          timestamp,
          type,
          intensity,
          confidence,
          breathing_rate: breathing_rate ?? null,
        })),
      );
      setPhase("done");
    } catch (err) {
      console.error("Saving reactions failed:", err);
      setError("Saving the reactions failed. Try again in a moment.");
      setPhase("error");
    }
  }, [session.id, stopCamera]);

  // One loop for calibration, live meters and recording.
  const loop = useCallback(() => {
    const cam = camRef.current;
    const landmarker = landmarkerRef.current;
    const video = videoRef.current;
    const p = phaseRef.current;

    if (landmarker && cam && cam.readyState >= 2) {
      const now = performance.now();
      if (now > lastFrameTsRef.current) {
        lastFrameTsRef.current = now;
        try {
          const shapes = landmarker.detectForVideo(cam, now).faceBlendshapes?.[0]?.categories;
          setFaceDetected(!!shapes);
          if (shapes) {
            const tracker = trackerRef.current;
            if (p === "calibrating" || p === "ready") {
              tracker.calibrate(shapes);
              if (p === "calibrating" && tracker.isCalibrated) setPhase("ready");
            }
            const s = tracker.update(shapes);
            setScores(s);

            if (p === "recording" && video && !video.paused && !video.ended) {
              const t = video.currentTime;
              if (
                lastSampleRef.current < 0 ||
                Math.abs(t - lastSampleRef.current) >= SAMPLE_EVERY
              ) {
                lastSampleRef.current = t;
                const top = dominantExpression(s);
                reactionsRef.current.push({
                  id: Date.now() + Math.random(),
                  timestamp: Math.round(t * 10) / 10,
                  type: top.type,
                  intensity:
                    top.type === "neutral" ? 0.15 : Number(Math.min(1, top.score / 100).toFixed(2)),
                  confidence: 0.9,
                  breathing_rate: latestRateRef.current() ?? null,
                });
                setReactions([...reactionsRef.current]);
              }
            }
          }
        } catch (err) {
          console.warn("Detection frame skipped:", err);
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (camRef.current) {
        camRef.current.srcObject = stream;
        await camRef.current.play();
      }
      trackerRef.current = new ExpressionTracker();
      reactionsRef.current = [];
      lastSampleRef.current = -1;
      savingRef.current = false;
      setReactions([]);
      setPhase("calibrating");
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Camera access was blocked. Allow the camera in your browser and try again.");
      setPhase("error");
    }
  }

  function startRecording() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setPhase("recording");
    void v.play();
  }

  const top = dominantExpression(scores);
  const topMeta = top.type === "neutral" ? null : EXPRESSION_META[top.type];
  const cameraOn = cameraActive;
  const stripDuration = Math.max(duration, ...reactions.map((r) => r.timestamp + 1), 1);
  const breakdown = Object.entries(
    reactions.reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = (acc[r.type] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <section className="card-surface space-y-5 rounded-2xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Record reactions</h2>
          <p className="text-sm text-muted-foreground">
            Watch the video with your camera on. Reactions are read on this device and saved to this
            test — no video of you is uploaded.
          </p>
        </div>
        {phase === "recording" && (
          <span className="inline-flex items-center gap-2 rounded-full bg-negative-soft px-3 py-1 text-xs font-semibold text-negative">
            <span className="h-2 w-2 animate-pulse rounded-full bg-negative" />
            Recording · {reactions.length} reactions
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* The video under test */}
        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              src={session.video_url || undefined}
              playsInline
              preload="metadata"
              className="aspect-video w-full object-contain"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                if (phaseRef.current === "recording") void save();
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={phase !== "recording"}
              onClick={() => {
                const v = videoRef.current;
                if (!v) return;
                if (v.paused) void v.play();
                else v.pause();
              }}
              aria-label={playing ? "Pause" : "Play"}
              className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              {playing ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="ml-0.5 h-3.5 w-3.5" />
              )}
            </button>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${duration ? (time / duration) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatTime(time)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Webcam + live meters */}
        <div className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
            <video
              ref={camRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full -scale-x-100 object-cover ${cameraOn ? "" : "hidden"}`}
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <CameraOff className="h-8 w-8 opacity-50" />
                <span className="text-xs">Camera off</span>
              </div>
            )}
            {cameraOn && <BreathingHud vitals={vitals} />}
            {cameraOn && (
              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                {!faceDetected ? (
                  "Looking for your face…"
                ) : phase === "calibrating" ? (
                  "Hold still — learning your resting face…"
                ) : (
                  <>
                    <span className="text-base leading-none">{topMeta?.emoji ?? "😐"}</span>
                    {topMeta?.label ?? "Neutral"}
                  </>
                )}
              </span>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {EXPRESSIONS.map((e) => (
              <div key={e.key} className="rounded-lg bg-muted/60 px-1.5 py-1.5 text-center">
                <div className="text-base leading-none">{e.emoji}</div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{ width: `${scores[e.key]}%`, backgroundColor: e.color }}
                  />
                </div>
                <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{e.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* This take's reactions, colored along the video */}
      {reactions.length > 0 && (
        <EmotionStrip
          reactions={reactions}
          duration={stripDuration}
          currentTime={time}
          className="h-4"
        />
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        {phase === "idle" && (
          <button
            type="button"
            onClick={startCamera}
            disabled={!modelReady}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-pop hover:bg-primary/90 disabled:opacity-60"
          >
            {modelReady ? (
              <>
                <Camera className="h-4 w-4" /> Turn on camera
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading face tracker…
              </>
            )}
          </button>
        )}

        {(phase === "calibrating" || phase === "ready") && (
          <button
            type="button"
            onClick={startRecording}
            disabled={phase !== "ready"}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-pop hover:bg-primary/90 disabled:opacity-60"
          >
            {phase === "ready" ? (
              <>
                <Play className="h-4 w-4" /> Start video & record
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Calibrating…
              </>
            )}
          </button>
        )}

        {phase === "recording" && (
          <button
            type="button"
            onClick={() => void save()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted"
          >
            <Square className="h-4 w-4 fill-current" /> Stop & save
          </button>
        )}

        {phase === "saving" && (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving reactions…
          </span>
        )}

        {phase === "done" && (
          <div className="flex w-full flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-positive">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-positive text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
              Saved {reactions.length} reactions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {breakdown.map(([type, count]) => (
                <span
                  key={type}
                  className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
                >
                  {emotionMeta(type).emoji} {emotionMeta(type).label} ×{count}
                </span>
              ))}
            </div>
          </div>
        )}

        {phase === "error" && error && <p className="text-sm text-negative">{error}</p>}

        <div className="ml-auto flex flex-wrap gap-2">
          {(phase === "done" || phase === "error") && modelReady && (
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" /> Record another take
            </button>
          )}
          {phase === "done" && (
            <Link
              to="/sessions/$sessionId"
              params={{ sessionId: session.id }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <BarChart3 className="h-4 w-4" /> View dashboard
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
