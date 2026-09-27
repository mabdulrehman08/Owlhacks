import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  PlusCircle,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ReactionRecorder } from "@/components/ReactionRecorder";
import { createSession, uploadVideo, type Session } from "@/lib/api";

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Submit Video & Create Test | Read The Room" },
      {
        name: "description",
        content:
          "Product owners upload or submit testable video content and generate unique participant links for reaction tracking.",
      },
      { property: "og:title", content: "Submit Video & Create Test | Read The Room" },
      {
        property: "og:description",
        content:
          "Product owners submit video content and send generated links to users and testers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShareTest,
});

const SAMPLE_VIDEOS = [
  {
    name: "Product Demo Concept",
    url: "/api/videos/product_demo.mp4",
    duration: "10s",
  },
  {
    name: "Interactive Flower Bloom",
    url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    duration: "10s",
  },
  {
    name: "Big Buck Bunny Short",
    url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    duration: "60s",
  },
];

const SOURCES = [
  { key: "upload", label: "Upload file", icon: Upload },
  { key: "url", label: "Video link", icon: Link2 },
  { key: "sample", label: "Sample clip", icon: Sparkles },
] as const;

type SourceType = (typeof SOURCES)[number]["key"];

/** "checkout_redesign-v2.mp4" -> "Checkout redesign v2" */
function titleFromFile(fileName: string) {
  const base = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
}

function ShareTest() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceType, setSourceType] = useState<SourceType>("upload");
  const [name, setName] = useState("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<Session | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // Cleanup object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const testLink = createdSession ? `${origin}/test/${createdSession.id}` : "";

  // What the preview player shows for the current source.
  const preview = sourceType === "upload" ? previewUrl : videoUrl || null;
  const hasVideo = sourceType === "upload" ? !!selectedFile : !!videoUrl.trim();

  function handleFileSelected(file: File) {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (!name.trim()) setName(titleFromFile(file.name));
    setError(null);
  }

  function clearFile() {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function chooseSource(next: SourceType) {
    setSourceType(next);
    setError(null);
    if (next === "sample" && !SAMPLE_VIDEOS.some((s) => s.url === videoUrl)) {
      setVideoUrl(SAMPLE_VIDEOS[0]?.url || "");
    } else if (next === "url" && SAMPLE_VIDEOS.some((s) => s.url === videoUrl)) {
      setVideoUrl("");
    }
  }

  function startOver() {
    setCreatedSession(null);
    setName("");
    setVideoUrl("");
    clearFile();
    setSubmitStatus("");
    setCopied(false);
  }

  async function handleCreateTest(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !hasVideo) return;

    setIsSubmitting(true);
    setError(null);

    try {
      let finalVideoUrl = videoUrl.trim();

      if (sourceType === "upload" && selectedFile) {
        setSubmitStatus("Uploading video…");
        const uploadResult = await uploadVideo(selectedFile);
        finalVideoUrl = uploadResult.video_url;
      }

      setSubmitStatus("Creating your test…");
      const session = await createSession({
        name: name.trim(),
        video_url: finalVideoUrl,
      });

      setCreatedSession(session);
    } catch (err: any) {
      console.error("Failed to create session:", err);
      setError(err?.message || String(err));
    } finally {
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <span className="eyebrow">New test</span>
          <h1 className="mt-1 text-2xl font-bold">Test a video</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your video and give it a name. Then record reactions right here with the face
            tracker, or send the link to other viewers. Everything shows up under Sessions.
          </p>
        </div>

        {createdSession ? (
          /* Done: the link to send */
          <>
            <section className="card-surface overflow-hidden rounded-2xl">
              <div className="flex items-center gap-3 border-b border-border bg-positive-soft px-6 py-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-positive text-white">
                  <Check className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">Your test is ready</h2>
                  <p className="truncate text-sm text-muted-foreground">{createdSession.name}</p>
                </div>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">
                    Want more viewers? Send them this link
                  </label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      readOnly
                      value={testLink}
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 rounded-xl border border-input bg-muted/40 px-3.5 py-3 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(testLink);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 2000);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied" : "Copy link"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <Link
                    to="/sessions/$sessionId"
                    params={{ sessionId: createdSession.id }}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                  >
                    <BarChart3 className="h-4 w-4 text-primary" /> View dashboard
                  </Link>
                  <Link
                    to="/test/$sessionId"
                    params={{ sessionId: createdSession.id }}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                  >
                    <ExternalLink className="h-4 w-4 text-primary" /> Open viewer page
                  </Link>
                  <button
                    type="button"
                    onClick={startOver}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <PlusCircle className="h-4 w-4" /> Test another video
                  </button>
                </div>
              </div>
            </section>
            <ReactionRecorder key={createdSession.id} session={createdSession} />
          </>
        ) : (
          /* Form */
          <form onSubmit={handleCreateTest} className="card-surface space-y-6 rounded-2xl p-6">
            {/* Video */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold">Video</h2>
                <div className="inline-flex rounded-xl bg-muted p-1">
                  {SOURCES.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => chooseSource(key)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                        sourceType === key
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {sourceType === "upload" && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelected(f);
                    }}
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Video className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1_048_576).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleFileSelected(f);
                      }}
                      className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                        dragging
                          ? "border-primary bg-primary/5"
                          : "border-input hover:border-primary/50 hover:bg-muted/40"
                      }`}
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                        <Upload className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-semibold">
                        Drop a video here or <span className="text-primary">browse</span>
                      </span>
                      <span className="text-xs text-muted-foreground">MP4, WebM or MOV</span>
                    </button>
                  )}
                </>
              )}

              {sourceType === "url" && (
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-3 font-mono text-sm outline-none focus:border-ring"
                />
              )}

              {sourceType === "sample" && (
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {SAMPLE_VIDEOS.map((sample) => (
                    <button
                      key={sample.url}
                      type="button"
                      onClick={() => setVideoUrl(sample.url)}
                      className={`rounded-xl border p-3.5 text-left transition-colors ${
                        videoUrl === sample.url
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-semibold">{sample.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{sample.duration} clip</p>
                    </button>
                  ))}
                </div>
              )}

              {preview && (
                <div className="overflow-hidden rounded-xl bg-black">
                  <video src={preview} controls className="aspect-video w-full object-contain" />
                </div>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label htmlFor="test-name" className="text-base font-semibold">
                Test name
              </label>
              <input
                id="test-name"
                required
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Checkout redesign concept"
                className="w-full rounded-xl border border-input bg-card px-3.5 py-3 text-sm outline-none focus:border-ring"
              />
            </div>

            {error && (
              <p className="rounded-xl bg-negative-soft px-3.5 py-2.5 text-sm text-negative">
                Couldn't create the test: {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Next you can record reactions here with your camera. Only reactions are saved.
              </p>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !hasVideo}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-pop transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {submitStatus}
                  </>
                ) : (
                  <>
                    Create test link <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
