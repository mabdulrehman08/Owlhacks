import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Focus,
  Info,
  Mic,
  Minus,
  Play,
  ScanFace,
  Sun,
  Video,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import fallback from "@/assets/camera-check.jpg";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Camera & Lighting Setup | ReactionLens" },
      {
        name: "description",
        content:
          "Participant setup: consent, camera check and lighting tips so facial reactions are captured clearly during a test session.",
      },
      { property: "og:title", content: "Camera & Lighting Setup | ReactionLens" },
      {
        property: "og:description",
        content:
          "Get ready for your session — check your camera, lighting and framing before the test begins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Setup,
});

const tips = [
  { icon: Sun, title: "Good Lighting", body: "Sit in a well-lit area, facing a light source. Avoid strong backlighting.", ok: true },
  { icon: Focus, title: "Center Your Face", body: "Position your face in the frame and keep your head visible during the session.", ok: true },
  { icon: ScanFace, title: "Reduce Obstructions", body: "Remove or minimize glasses, hats, or anything that covers your face.", ok: false },
  { icon: FileText, title: "Consent Required", body: "We'll ask for your consent to analyze your facial reactions before the test begins.", ok: true },
];

function Setup() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function enableCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setLive(true);
      setError(null);
    } catch {
      setError("We couldn't access your camera. Check your browser permissions and try again.");
    }
  }

  const checks = [
    { label: "Camera access enabled", sub: live ? "We can access your camera." : "Turn on your camera to continue.", state: live ? "ok" : "pending" },
    { label: "Face visible", sub: "Your face is detected and centered.", state: live ? "ok" : "pending" },
    { label: "Lighting good", sub: "Your lighting looks great.", state: live ? "ok" : "pending" },
    { label: "Audio optional", sub: "Microphone detected (optional for this test).", state: "skip" },
  ] as const;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <ol className="mb-8 flex items-center justify-center gap-4 text-xs font-medium">
          {["Consent", "Camera Check", "Begin Session"].map((label, i) => {
            const state = i === 0 ? "done" : i === 1 ? "current" : "todo";
            return (
              <li key={label} className="flex items-center gap-3">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full ${
                    state === "todo"
                      ? "border border-border bg-card text-muted-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {state === "done" ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={state === "current" ? "text-primary" : "text-muted-foreground"}>
                  {i + 1}. {label}
                </span>
                {i < 2 && <span className="hidden h-px w-16 bg-border sm:block" />}
              </li>
            );
          })}
        </ol>

        <div className="text-center">
          <h1 className="text-3xl font-semibold">Get ready for your session</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Let's make sure your camera and environment are set up for the best experience. This helps us
            capture clear facial reactions during the test.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-foreground">
              <video
                ref={videoRef}
                playsInline
                muted
                className="aspect-[4/3] w-full object-cover"
                style={{ display: live ? "block" : "none" }}
              />
              {!live && (
                <img src={fallback} alt="" width={1280} height={960} loading="lazy" className="aspect-[4/3] w-full object-cover opacity-70" />
              )}
              <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-foreground/70 px-2.5 py-1.5 text-xs font-medium text-background backdrop-blur">
                <span className={`h-2 w-2 rounded-full ${live ? "bg-positive" : "bg-notable"}`} />
                {live ? "Good quality" : "Camera off"}
              </span>
              <span className="pointer-events-none absolute inset-x-[28%] inset-y-[18%] rounded-xl border-2 border-background/70 [clip-path:polygon(0_0,28%_0,28%_4%,0_4%,0_28%,4%_28%,4%_0,100%_0,100%_28%,96%_28%,96%_0,100%_0,100%_100%,72%_100%,72%_96%,100%_96%,100%_72%,96%_72%,96%_100%,0_100%,0_72%,4%_72%,4%_100%)]" />
              <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-gradient-to-t from-foreground/90 to-transparent p-3 pt-10">
                <span className="inline-flex items-center gap-2 rounded-lg bg-background/90 px-3 py-2 text-xs font-medium">
                  <Video className="h-4 w-4" /> FaceTime HD Camera
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-background/90 px-3 py-2 text-xs font-medium">
                  <Mic className="h-4 w-4" /> Default – MacBook Mic
                </span>
                {!live && (
                  <button
                    onClick={() => void enableCamera()}
                    className="ml-auto rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Enable camera
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-negative-soft px-3.5 py-2.5 text-xs text-negative">{error}</p>
            )}

            <section className="card-surface p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Camera Check Status</h2>
                <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                  Troubleshooting help <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </div>
              <ul className="space-y-3">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-3">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                        c.state === "ok"
                          ? "bg-positive text-primary-foreground"
                          : c.state === "skip"
                            ? "bg-muted text-muted-foreground"
                            : "bg-notable-soft text-notable"
                      }`}
                    >
                      {c.state === "ok" ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : c.state === "skip" ? (
                        <Minus className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{c.label}</span>
                      <span className="block text-xs text-muted-foreground">{c.sub}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="space-y-4">
            {tips.map((t) => (
              <div key={t.title} className="card-surface flex items-start gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-primary">
                  <t.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
                </div>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                    t.ok ? "bg-positive text-primary-foreground" : "bg-destructive text-destructive-foreground"
                  }`}
                >
                  {t.ok ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-3.5 w-3.5" />}
                </span>
              </div>
            ))}

            <div className="rounded-2xl bg-info-soft p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Info className="h-4 w-4 text-primary" /> How we use your data
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                We analyze observable facial signals (e.g. smiles, surprise, confusion) to understand
                reactions to the content. This is not mind reading, and we do not infer your thoughts or
                personal attributes.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop hover:bg-primary/90">
            <Play className="h-4 w-4" /> Start Test
          </button>
          <p className="mx-auto mt-3 max-w-lg text-xs text-muted-foreground">
            By starting, you confirm you've read and consent to the use of your facial reactions for
            research purposes as described above.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
