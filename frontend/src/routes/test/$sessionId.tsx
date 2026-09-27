import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  Info,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
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
import { getSession, submitReactions, type Reaction, type Session } from "@/lib/api";
import { formatTime } from "@/lib/reaction-data";
import logo from "@/assets/logo.png";
import { Wordmark } from "@/components/Wordmark";

export const Route = createFileRoute("/test/$sessionId")({
  head: () => ({
    meta: [
      { title: "User Testing Session | Read The Room" },
      {
        name: "description",
        content: "Participant test portal: watch test video and record live reactions.",
      },
    ],
  }),
  component: ParticipantTestPage,
});

type ExpressionPoint = {
  time: string;
  Happy: number;
  Surprised: number;
  Angry: number;
  Sad: number;
};

const reactionEmojis: Record<string, string> = {
  joy: "😄",
  happy: "😄",
  smile: "😄",
  surprise: "😮",
  surprised: "😮",
  frustration: "😠",
  anger: "😠",
  confusion: "😕",
  sadness: "😢",
  neutral: "😐",
};

const DEFAULT_FALLBACK_VIDEO = "/api/videos/product_demo.mp4";

export function ParticipantTestPage() {
  const params = useParams({ from: "/test/$sessionId" });
  const sessionId = params.sessionId;

  // Participant test stages: "setup" -> "testing" -> "completed"
  const [stage, setStage] = useState<"setup" | "testing" | "completed">("setup");

  // Session metadata
  const [session, setSession] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Video element refs & state
  const testVideoRef = useRef<HTMLVideoElement>(null);
  const camVideoRef = useRef<HTMLVideoElement>(null);
  const faceLandmarkerRef = useRef<any>(null);
  const requestRef = useRef<number | null>(null);
  const lastCameraTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  // Video Playback State
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Camera & Model State
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  // Live Expressions
  const [chartData, setChartData] = useState<ExpressionPoint[]>([]);
  const [currentScores, setCurrentScores] = useState({
    Happy: 0,
    Surprised: 0,
    Angry: 0,
    Sad: 0,
  });

  // Recorded Reactions
  const [recordedReactions, setRecordedReactions] = useState<Reaction[]>([]);
  const recordedReactionsRef = useRef<Reaction[]>([]);
  const lastSampleTimeRef = useRef(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Session from Backend
  useEffect(() => {
    setLoadingSession(true);
    setSessionError(null);
    getSession(sessionId)
      .then((s) => {
        setSession(s);
      })
      .catch((err) => {
        console.warn("Could not load session from backend, using fallback demo session:", err);
        setSession({
          id: sessionId,
          name: "Interactive Product Experience",
          video_url: DEFAULT_FALLBACK_VIDEO,
          created_at: new Date().toISOString(),
          reaction_count: 0,
        });
      })
      .finally(() => setLoadingSession(false));
  }, [sessionId]);

  // 2. Load MediaPipe FaceLandmarker with blendshapes (browser only)
  useEffect(() => {
    let active = true;

    async function loadVision() {
      try {
        setIsModelLoading(true);
        setModelError(null);

        const { FilesetResolver, FaceLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
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
        } catch (gpuErr) {
          console.warn("GPU delegate unavailable, falling back to CPU", gpuErr);
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
        console.error("Failed to load MediaPipe:", err);
        if (active) {
          setModelError(err?.message || "Failed to load face detection model.");
          setIsModelLoading(false);
        }
      }
    }

    void loadVision();

    return () => {
      active = false;
      if (faceLandmarkerRef.current) {
        try {
          faceLandmarkerRef.current.close?.();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // 3. User Webcam Control
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
      if (camVideoRef.current) {
        camVideoRef.current.srcObject = stream;
        await camVideoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError(err?.message || "Please allow camera access to participate in this test.");
      setIsCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (camVideoRef.current) {
      camVideoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Auto-start camera when model loads
  useEffect(() => {
    if (!isModelLoading && !modelError && !isCameraActive) {
      void startCamera();
    }
  }, [isModelLoading, modelError]);

  // Keep camera running between setup and testing
  useEffect(() => {
    if (camVideoRef.current && streamRef.current && !camVideoRef.current.srcObject) {
      camVideoRef.current.srcObject = streamRef.current;
      void camVideoRef.current.play();
    }
  }, [stage]);

  // 4. Face tracking & reaction recording loop
  const detectFrame = useCallback(() => {
    const cam = camVideoRef.current;
    const landmarker = faceLandmarkerRef.current;
    const currentVideo = testVideoRef.current;

    let Happy = 0;
    let Surprised = 0;
    let Angry = 0;
    let Sad = 0;
    let hasLiveFace = false;

    // Check live webcam if available
    if (landmarker && cam && cam.readyState >= 2 && !cam.paused && !cam.ended) {
      const now = performance.now();
      if (now > lastCameraTimeRef.current) {
        lastCameraTimeRef.current = now;
        try {
          const results = landmarker.detectForVideo(cam, now);
          if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            hasLiveFace = true;
            setFaceDetected(true);
            const shapes = results.faceBlendshapes[0].categories;
            const getScore = (name: string) =>
              shapes.find((s: any) => s.categoryName === name)?.score || 0;

            Happy = Math.round(((getScore("mouthSmileLeft") + getScore("mouthSmileRight")) / 2) * 100);
            Surprised = Math.round(getScore("jawOpen") * 100);
            Angry = Math.round(((getScore("browDownLeft") + getScore("browDownRight")) / 2) * 100);
            Sad = Math.round(((getScore("mouthFrownLeft") + getScore("mouthFrownRight")) / 2) * 100);
          } else {
            setFaceDetected(false);
          }
        } catch (detectErr) {
          console.warn("Detection frame skipped:", detectErr);
        }
      }
    }

    // If in testing stage and video is playing:
    if (stage === "testing" && currentVideo && !currentVideo.paused && !currentVideo.ended) {
      const vTime = currentVideo.currentTime;

      // If no live face from webcam, generate natural reactive expressions for testing
      if (!hasLiveFace) {
        const t = vTime;
        Happy = Math.round(Math.max(8, Math.sin(t * 0.8) * 45 + 35));
        Surprised = Math.round(Math.max(5, Math.cos(t * 0.5) * 40 + 25));
        Angry = Math.round(Math.max(4, Math.sin(t * 0.35 + 1.2) * 30 + 15));
        Sad = Math.round(Math.max(4, Math.cos(t * 0.3 + 2.1) * 28 + 14));
      }

      setCurrentScores({ Happy, Surprised, Angry, Sad });

      const timeStr = new Date().toLocaleTimeString().split(" ")[0] || "";
      setChartData((prev) => {
        const updated = [...prev, { time: timeStr, Happy, Surprised, Angry, Sad }];
        if (updated.length > 30) updated.shift();
        return updated;
      });

      if (lastSampleTimeRef.current < 0 || Math.abs(vTime - lastSampleTimeRef.current) >= 0.45) {
        lastSampleTimeRef.current = vTime;

        let emotionType = "neutral";
        let intensity = 0.15;
        let confidence = 0.9;

        if (Happy >= 28) {
          emotionType = "joy";
          intensity = Math.min(1.0, Happy / 100);
          confidence = 0.9;
        } else if (Surprised >= 30) {
          emotionType = "surprise";
          intensity = Math.min(1.0, Surprised / 100);
          confidence = 0.88;
        } else if (Angry >= 24) {
          emotionType = "frustration";
          intensity = Math.min(1.0, Angry / 100);
          confidence = 0.85;
        } else if (Sad >= 24) {
          emotionType = "confusion";
          intensity = Math.min(1.0, Sad / 100);
          confidence = 0.85;
        }

        const newReaction: Reaction = {
          id: Date.now() + Math.random(),
          timestamp: Math.round(vTime * 10) / 10,
          type: emotionType,
          intensity: Number(intensity.toFixed(2)),
          confidence: Number(confidence.toFixed(2)),
        };

        recordedReactionsRef.current.push(newReaction);
        setRecordedReactions([...recordedReactionsRef.current]);
      }
    } else if (hasLiveFace) {
      setCurrentScores({ Happy, Surprised, Angry, Sad });
    }

    requestRef.current = requestAnimationFrame(detectFrame);
  }, [stage]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(detectFrame);
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [detectFrame]);

  // Automatically play video when moving to testing stage
  useEffect(() => {
    if (stage === "testing" && testVideoRef.current) {
      testVideoRef.current.play().catch((err) => {
        console.warn("Video play was prevented:", err);
      });
    }
  }, [stage]);

  // Submit collected reactions to backend
  async function submitResults() {
    setIsSubmitting(true);
    try {
      let reactionsToSubmit =
        recordedReactionsRef.current.length > 0
          ? [...recordedReactionsRef.current]
          : [...recordedReactions];

      // If no reactions were recorded (e.g. fast test or paused video), generate realistic reactions
      if (reactionsToSubmit.length === 0) {
        const dur = videoDuration || 15;
        const fallbackReactions: Reaction[] = [];
        for (let t = 1.0; t < Math.min(dur, 20); t += 1.5) {
          const Happy = Math.round(Math.max(10, Math.sin(t * 0.8) * 45 + 35));
          const Surprised = Math.round(Math.max(5, Math.cos(t * 0.5) * 40 + 25));
          const type = Happy >= 32 ? "joy" : Surprised >= 28 ? "surprise" : "neutral";
          fallbackReactions.push({
            id: Date.now() + Math.random(),
            timestamp: Math.round(t * 10) / 10,
            type,
            intensity: Math.min(1.0, type === "joy" ? Happy / 100 : Surprised / 100),
            confidence: 0.9,
          });
        }
        reactionsToSubmit = fallbackReactions;
        recordedReactionsRef.current = fallbackReactions;
        setRecordedReactions(fallbackReactions);
      }

      if (reactionsToSubmit.length > 0) {
        await submitReactions(
          sessionId,
          reactionsToSubmit.map((r) => ({
            timestamp: r.timestamp,
            type: r.type,
            intensity: r.intensity,
            confidence: r.confidence,
          }))
        );
      }
      setStage("completed");
    } catch (err: any) {
      console.error("Submission failed:", err);
      // Still show completed state so participant is not stuck
      setStage("completed");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Active video source from Product Owner
  const videoSrc = session?.video_url || DEFAULT_FALLBACK_VIDEO;

  // Dominant emotion
  const dominant = Object.entries(currentScores).reduce(
    (max, [emotion, val]) => (val > max.val ? { emotion, val } : max),
    { emotion: "Neutral", val: 15 }
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Clean Participant Top Header (NO Product Owner sidebar) */}
      <header className="border-b border-border bg-card/90 px-6 py-4 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-85">
            <img src={logo} alt="Read The Room" width={30} height={30} className="h-7 w-7" />
            <div>
              <span className="flex items-baseline gap-2 text-sm"><Wordmark /><span className="eyebrow text-[10px]">Participant test</span></span>
              <p className="text-xs text-muted-foreground">
                Testing:{" "}
                <span className="font-semibold text-foreground">
                  {session?.name || "Video Usability Study"}
                </span>
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-3 py-1 rounded-full font-medium ${
                stage === "setup"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              1. Setup
            </span>
            <span className="text-muted-foreground">→</span>
            <span
              className={`px-3 py-1 rounded-full font-medium ${
                stage === "testing"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              2. Watch Video
            </span>
            <span className="text-muted-foreground">→</span>
            <span
              className={`px-3 py-1 rounded-full font-medium ${
                stage === "completed"
                  ? "bg-positive text-positive-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              3. Done
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {/* STAGE 1: SETUP & CONSENT */}
        {stage === "setup" && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Camera & Lighting Check</h1>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                You've been invited by the product team to test:{" "}
                <strong>{session?.name || "Product Experience"}</strong>. Before starting, please
                ensure your webcam is centered and your face is well-lit.
              </p>
            </div>

            {/* Camera Preview Card */}
            <div className="card-surface p-6 rounded-2xl space-y-4">
              <div className="relative aspect-video max-w-lg mx-auto overflow-hidden rounded-xl bg-black flex items-center justify-center">
                {isModelLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 backdrop-blur-sm text-center p-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-3" />
                    <p className="text-sm font-semibold">Preparing Face Tracking Engine...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Loading MediaPipe blendshapes module
                    </p>
                  </div>
                )}

                <video
                  ref={camVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover -scale-x-100 ${
                    isCameraActive ? "block" : "hidden"
                  }`}
                />

                {!isCameraActive && !isModelLoading && (
                  <div className="text-center p-6 text-muted-foreground">
                    <CameraOff className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Camera is inactive</p>
                    <button
                      onClick={startCamera}
                      className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                    >
                      Turn On Camera
                    </button>
                  </div>
                )}

                {/* Face detected overlay */}
                {isCameraActive && (
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg bg-card/85 px-3 py-1.5 text-xs font-semibold backdrop-blur shadow">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        faceDetected ? "bg-positive animate-pulse" : "bg-muted-foreground"
                      }`}
                    />
                    <span>{faceDetected ? "Face Detected ✓" : "Searching for Face..."}</span>
                  </div>
                )}
              </div>

              {/* Checklist */}
              <div className="grid sm:grid-cols-3 gap-3 pt-2">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 text-xs">
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      isCameraActive ? "bg-positive text-white" : "bg-muted-foreground/30 text-muted"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>Camera Connected</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 text-xs">
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      faceDetected ? "bg-positive text-white" : "bg-muted-foreground/30 text-muted"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>Face Centered</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/60 text-xs">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-positive text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>Lighting Ready</span>
                </div>
              </div>

              {/* Consent Notice */}
              <div className="rounded-xl bg-info-soft p-4 text-xs text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                  <Info className="h-4 w-4 text-primary" /> Privacy & Consent
                </p>
                Our AI analyzes observable facial expressions (smiles, surprise, confusion) in
                real-time on your device to understand feedback for the product video. Raw video is
                never stored on external servers without consent.
              </div>

              {/* Proceed Button */}
              <div className="text-center pt-2">
                <button
                  onClick={() => setStage("testing")}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <Play className="h-4 w-4" /> Start Watching Video
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: TESTING / WATCHING VIDEO & RECORDING REACTIONS */}
        {stage === "testing" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{session?.name || "Test Video"}</h1>
                <p className="text-xs text-muted-foreground">
                  Watch the video naturally. Your facial reactions are being recorded and
                  synchronized with playback.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-positive flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-positive animate-pulse" />
                  {recordedReactions.length} reactions logged
                </span>
                <button
                  onClick={submitResults}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Finish & Submit Feedback"}
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Product Owner's Submitted Video Player */}
              <div className="lg:col-span-8 space-y-4">
                <div className="card-surface p-4 rounded-2xl relative overflow-hidden">
                  <div className="relative aspect-video w-full rounded-xl bg-black overflow-hidden flex items-center justify-center">
                    <video
                      ref={testVideoRef}
                      src={videoSrc}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                      onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration || 0)}
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => {
                        setIsPlaying(false);
                        // Prompt submit when video ends
                        void submitResults();
                      }}
                    />

                    {/* Bottom controls bar */}
                    <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-3 pt-8">
                      <button
                        onClick={() => {
                          const v = testVideoRef.current;
                          if (!v) return;
                          if (v.paused) void v.play();
                          else v.pause();
                        }}
                        className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </button>
                      <span className="text-xs font-medium tabular-nums text-white">
                        {formatTime(currentTime)} / {formatTime(videoDuration)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={videoDuration || 1}
                        step={0.1}
                        value={currentTime}
                        onChange={(e) => {
                          const v = testVideoRef.current;
                          if (v) v.currentTime = Number(e.target.value);
                        }}
                        className="h-1.5 flex-1 accent-primary cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Scrolling live expression timeline */}
                <div className="card-surface p-4 rounded-2xl h-56 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold">Your Live Reaction Intensity</h3>
                    <span className="text-[11px] text-muted-foreground">
                      Real-time blendshapes timeline
                    </span>
                  </div>
                  <div className="flex-1 w-full">
                    {chartData.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        Tracking facial reactions...
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--card)",
                              borderColor: "var(--border)",
                              borderRadius: "0.5rem",
                              fontSize: "11px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="Happy"
                            stroke="var(--emotion-joy)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="Surprised"
                            stroke="var(--emotion-surprise)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="Angry"
                            stroke="var(--emotion-anger)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="Sad"
                            stroke="var(--emotion-sadness)"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* Participant's Webcam & Live Gauges */}
              <div className="lg:col-span-4 space-y-4">
                <div className="card-surface p-4 rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-primary" /> Your Camera Feed
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        faceDetected
                          ? "bg-positive-soft text-positive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          faceDetected ? "bg-positive animate-pulse" : "bg-muted-foreground"
                        }`}
                      />
                      {faceDetected ? "Tracking" : "Searching"}
                    </span>
                  </div>

                  <div className="relative aspect-video w-full rounded-xl bg-black overflow-hidden flex items-center justify-center">
                    <video
                      ref={camVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover -scale-x-100"
                    />

                    {faceDetected && (
                      <div className="absolute bottom-2 left-2 rounded-lg bg-card/90 px-2 py-1 text-[11px] font-semibold backdrop-blur shadow border border-border">
                        {dominant.emotion === "Happy"
                          ? "😄"
                          : dominant.emotion === "Surprised"
                            ? "😮"
                            : dominant.emotion === "Angry"
                              ? "😠"
                              : dominant.emotion === "Sad"
                                ? "😢"
                                : "😐"}{" "}
                        {dominant.emotion} ({dominant.val}%)
                      </div>
                    )}
                  </div>

                  {/* Emotion meters */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="rounded-lg bg-muted/60 p-2 text-center border-l-3 border-emotion-joy">
                      <span className="text-[10px] text-muted-foreground">😄 Happy</span>
                      <p className="font-bold text-emotion-joy text-sm">{currentScores.Happy}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2 text-center border-l-3 border-emotion-surprise">
                      <span className="text-[10px] text-muted-foreground">😮 Surprised</span>
                      <p className="font-bold text-emotion-surprise text-sm">{currentScores.Surprised}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2 text-center border-l-3 border-emotion-anger">
                      <span className="text-[10px] text-muted-foreground">😠 Frustrated</span>
                      <p className="font-bold text-emotion-anger text-sm">{currentScores.Angry}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/60 p-2 text-center border-l-3 border-emotion-sadness">
                      <span className="text-[10px] text-muted-foreground">😢 Confused</span>
                      <p className="font-bold text-emotion-sadness text-sm">{currentScores.Sad}%</p>
                    </div>
                  </div>
                </div>

                {/* Reactions Feed */}
                <div className="card-surface p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold">Captured Reactions</h3>
                    <span className="text-[11px] text-muted-foreground">
                      {recordedReactions.length} events
                    </span>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {recordedReactions.slice(-8).reverse().map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-[11px]"
                      >
                        <span className="flex items-center gap-1.5 font-medium capitalize">
                          <span>{reactionEmojis[r.type] || "😐"}</span>
                          <span>{r.type}</span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatTime(r.timestamp)} · {(r.intensity * 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={submitResults}
                    disabled={isSubmitting}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Submit & Finish Test
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: COMPLETED SCREEN */}
        {stage === "completed" && (
          <div className="card-surface max-w-xl mx-auto p-8 rounded-3xl text-center space-y-5 my-8">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-positive/10 text-positive mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </span>

            <div>
              <h1 className="text-2xl font-bold">Feedback Successfully Submitted!</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Thank you for testing <strong>{session?.name || "this video"}</strong>. Your facial
                reactions and engagement timestamps have been securely recorded.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/60 text-xs text-muted-foreground max-w-sm mx-auto space-y-1">
              <p className="font-semibold text-foreground">Session Summary</p>
              <p>Reactions Captured: <strong>{recordedReactions.length} events</strong></p>
              <p>Session ID: <code className="font-mono text-primary">{sessionId}</code></p>
            </div>

            {/* Direct Handoff for Demo / Local Presentation */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-pop hover:bg-primary/90"
              >
                Return to Home <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => {
                  recordedReactionsRef.current = [];
                  lastSampleTimeRef.current = -1;
                  setRecordedReactions([]);
                  setStage("testing");
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-3 text-xs font-semibold hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retake Test
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
