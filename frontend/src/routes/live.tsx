import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Activity,
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  Video,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import {
  EXPRESSIONS,
  EXPRESSION_META,
  ExpressionTracker,
  dominantExpression,
  emptyScores,
  type ExpressionScores,
} from "@/lib/expressions";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Facial Expression Tracker | Read The Room" },
      {
        name: "description",
        content:
          "Real-time webcam facial reaction detection powered by MediaPipe vision blendshapes.",
      },
    ],
  }),
  component: LiveTrackerPage,
});

type ExpressionPoint = { time: string } & ExpressionScores;

export function LiveTrackerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [chartData, setChartData] = useState<ExpressionPoint[]>([]);
  const [currentScores, setCurrentScores] = useState<ExpressionScores>(emptyScores);
  // The first ~second of frames is the viewer's resting face; scores are relative to it.
  const trackerRef = useRef(new ExpressionTracker());
  const [calibrated, setCalibrated] = useState(false);

  // 1. Initialize MediaPipe FaceLandmarker with blendshapes (browser only)
  useEffect(() => {
    let active = true;

    async function initMediaPipe() {
      try {
        setIsModelLoading(true);
        setModelError(null);

        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm",
        );

        if (!active) return;

        let landmarker: any;
        try {
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
          });
        } catch (gpuError) {
          console.warn("GPU delegate unavailable, falling back to CPU delegate", gpuError);
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "CPU",
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
          });
        }

        if (active) {
          faceLandmarkerRef.current = landmarker;
          setIsModelLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to load MediaPipe model:", err);
        if (active) {
          setModelError(
            err?.message || "Failed to load MediaPipe vision model. Check internet connectivity.",
          );
          setIsModelLoading(false);
        }
      }
    }

    void initMediaPipe();

    return () => {
      active = false;
      if (faceLandmarkerRef.current) {
        try {
          faceLandmarkerRef.current.close?.();
        } catch {
          // Ignore close errors
        }
      }
    };
  }, []);

  // 2. Start webcam
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Failed to access camera:", err);
      setCameraError(err?.message || "Camera permission denied or camera unavailable.");
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setFaceDetected(false);
  }, []);

  // Auto-start camera when model finishes loading
  useEffect(() => {
    if (!isModelLoading && !modelError && !isCameraActive && !cameraError) {
      void startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isModelLoading, modelError]);

  // 3. Real-time detection loop
  const detectFace = useCallback(() => {
    const video = videoRef.current;
    const landmarker = faceLandmarkerRef.current;

    if (!landmarker || !video || video.readyState < 2 || video.paused || video.ended) {
      requestRef.current = requestAnimationFrame(detectFace);
      return;
    }

    const now = performance.now();
    // Ensure monotonic timestamps required by MediaPipe VIDEO mode
    if (now <= lastTimestampRef.current) {
      requestRef.current = requestAnimationFrame(detectFace);
      return;
    }
    lastTimestampRef.current = now;

    try {
      const results = landmarker.detectForVideo(video, now);

      if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
        setFaceDetected(true);
        const shapes = results.faceBlendshapes[0].categories;
        const tracker = trackerRef.current;
        if (!tracker.isCalibrated) {
          tracker.calibrate(shapes);
          setCalibrated(tracker.isCalibrated);
        }
        const scores = tracker.update(shapes);
        setCurrentScores(scores);

        const timeStr = new Date().toLocaleTimeString().split(" ")[0] || "";
        setChartData((prev) => {
          const updated = [...prev, { time: timeStr, ...scores }];
          if (updated.length > 30) updated.shift();
          return updated;
        });
      } else {
        setFaceDetected(false);
      }
    } catch (detectErr) {
      console.warn("Detection frame skipped:", detectErr);
    }

    requestRef.current = requestAnimationFrame(detectFace);
  }, []);

  // 4. Start processing loop once camera and model are ready
  useEffect(() => {
    if (!isModelLoading && isCameraActive && faceLandmarkerRef.current) {
      requestRef.current = requestAnimationFrame(detectFace);
    }
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isModelLoading, isCameraActive, detectFace]);

  // Determine dominant emotion
  const dominant = dominantExpression(currentScores);
  const dominantMeta = dominant.type === "neutral" ? null : EXPRESSION_META[dominant.type];
  const dominantEmoji = dominantMeta?.emoji ?? "😐";

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Activity className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-bold">Live Facial Expressions</h1>
                <p className="text-xs text-muted-foreground">
                  Real-time facial blendshapes tracking via MediaPipe vision models (inherited from
                  old prototype)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/test/$sessionId"
              params={{ sessionId: "demo" }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Video className="h-4 w-4" /> Open Participant Test View
            </Link>
          </div>
        </div>

        {/* Model & Camera status notices */}
        {modelError && (
          <div className="flex items-center gap-3 rounded-xl bg-negative-soft p-4 text-negative">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{modelError}</p>
          </div>
        )}

        {cameraError && (
          <div className="flex items-center gap-3 rounded-xl bg-negative-soft p-4 text-negative">
            <CameraOff className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-2 text-xs font-semibold underline hover:no-underline"
              >
                Retry camera access
              </button>
            </div>
          </div>
        )}

        {/* Main Grid: Webcam + Real-Time Recharts Graph */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Webcam View */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card-surface p-4 relative overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" /> Live Camera Feed
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      faceDetected
                        ? "bg-positive-soft text-positive"
                        : isCameraActive
                          ? "bg-info-soft text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        faceDetected
                          ? "bg-positive animate-pulse"
                          : isCameraActive
                            ? "bg-primary"
                            : "bg-muted-foreground"
                      }`}
                    />
                    {faceDetected
                      ? "Face Detected"
                      : isCameraActive
                        ? "Searching..."
                        : "Camera Off"}
                  </span>
                </div>
              </div>

              {/* Video container */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black flex items-center justify-center">
                {isModelLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 backdrop-blur-sm text-center p-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3" />
                    <p className="text-sm font-semibold">Loading MediaPipe AI Model...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Downloading vision task WASM and blendshapes assets
                    </p>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover -scale-x-100 ${
                    isCameraActive ? "block" : "hidden"
                  }`}
                />

                {!isCameraActive && !isModelLoading && (
                  <div className="text-center p-6 text-muted-foreground">
                    <CameraOff className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Camera is inactive</p>
                    <button
                      onClick={startCamera}
                      className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Turn Camera On
                    </button>
                  </div>
                )}

                {/* Dominant Emotion Overlay Badge */}
                {isCameraActive && faceDetected && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-card/85 px-3 py-1.5 text-xs font-semibold backdrop-blur shadow-md border border-border">
                    <span className="text-base">{dominantEmoji}</span>
                    <span>
                      {calibrated
                        ? `${dominantMeta?.label ?? "Neutral"} (${dominant.score}%)`
                        : "Calibrating — relax your face…"}
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Actions */}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Running Mode:{" "}
                  <span className="font-semibold text-foreground">Client GPU/WASM</span>
                </span>
                {isCameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="text-muted-foreground hover:text-destructive text-xs"
                  >
                    Pause Camera
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="text-primary hover:underline text-xs font-semibold"
                  >
                    Start Camera
                  </button>
                )}
              </div>
            </div>

            {/* Current Real-time Scores */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {EXPRESSIONS.map((e) => (
                <div
                  key={e.key}
                  className="card-surface p-3 text-center border-l-4"
                  style={{ borderLeftColor: e.color }}
                >
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    {e.emoji} {e.label}
                  </p>
                  <p className="stat-number text-xl mt-1" style={{ color: e.color }}>
                    {currentScores[e.key]}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recharts Continuous Scrolling Graph */}
          <div className="lg:col-span-7 space-y-4">
            <div className="card-surface p-5 rounded-2xl flex flex-col h-full min-h-[420px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold">Real-Time Expression Timeline</h3>
                  <p className="text-xs text-muted-foreground">
                    Continuous 60 FPS blendshape heuristics scrolling window (last 30 frames)
                  </p>
                </div>
                <button
                  onClick={() => setChartData([])}
                  title="Clear timeline"
                  className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {/* Chart container */}
              <div className="w-full flex-1 min-h-[320px]">
                {chartData.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground p-8">
                    <Activity className="h-10 w-10 mb-2 opacity-40 animate-pulse" />
                    <p className="text-sm font-medium">Awaiting facial detection data...</p>
                    <p className="text-xs max-w-sm mt-1">
                      Turn on your camera and look directly at the screen to start plotting live
                      expressions.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "0.75rem",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      {EXPRESSIONS.map((e) => (
                        <Line
                          key={e.key}
                          type="monotone"
                          dataKey={e.key}
                          name={`${e.emoji} ${e.label}`}
                          stroke={e.color}
                          strokeWidth={3}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
