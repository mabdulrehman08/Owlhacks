import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Info,
  Link2,
  Play,
  PlusCircle,
  Sparkles,
  Upload,
  Video,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { createSession, type Session } from "@/lib/api";

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


const steps = [
  {
    icon: FileText,
    title: "1. Consent & Prep",
    body: "Participants review a short consent notice about observable facial reactions.",
  },
  {
    icon: Camera,
    title: "2. Camera Check",
    body: "They enable their webcam; MediaPipe validates face visibility and lighting in real-time.",
  },
  {
    icon: Play,
    title: "3. Watch Your Video",
    body: "They watch your submitted video while client-side blendshapes measure engagement and emotions.",
  },
  {
    icon: CheckCircle2,
    title: "4. Receive Stats in Dashboard",
    body: "Reactions are securely saved and the Product Owner inspects intensity graphs, top moments, and AI chat.",
  },
];

function ShareTest() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("Checkout Redesign Concept");
  const [description, setDescription] = useState(
    "We're testing a new checkout experience. Watch the short video and share your honest reactions."
  );
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSession, setCreatedSession] = useState<Session | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const testLink = createdSession
    ? `${origin}/test/${createdSession.id}`
    : `${origin}/test/demo`;

  async function handleCreateTest(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const session = await createSession({
        name: name.trim(),
        video_url: videoUrl || undefined,
      });
      setCreatedSession(session);
    } catch (err: any) {
      console.error("Failed to create session:", err);
      alert("Failed to create session: " + (err?.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Main Column */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <span>Product Owner Portal</span>
            </div>
            <h1 className="text-2xl font-bold">Submit Video & Create Test Link</h1>
            <p className="text-sm text-muted-foreground">
              Upload or configure testable video content, then generate a unique shareable link for
              participants. The recorded reactions will stream directly to your Product Owner
              dashboard.
            </p>
          </div>

          {/* Quick Active Link Box */}
          <div className="card-surface p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-primary/30 bg-primary/5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <ExternalLink className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Active Participant Testing Link {createdSession ? "(Newly Created)" : "(Demo Test)"}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{testLink}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to={createdSession ? `/test/${createdSession.id}` : "/test/demo"}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open Link as Participant
              </Link>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(testLink);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-input bg-card px-3 py-2 text-xs font-semibold hover:bg-muted"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-positive" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateTest} className="space-y-6">
            {/* Step 1: Submit Content */}
            <section className="card-surface p-5 rounded-2xl">
              <header className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-base font-semibold">
                  <Num>1</Num> Submit Testable Video Content
                </h2>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Video className="h-4 w-4 text-primary" /> Supported: MP4, WebM
                </span>
              </header>

              {/* Video source inputs */}

                <div className="rounded-xl border border-dashed border-input p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setUploadedFile({
                          name: f.name,
                          size: `${(f.size / 1_048_576).toFixed(1)} MB`,
                        });
                        setVideoUrl(URL.createObjectURL(f));
                      }
                    }}
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-xl max-w-md mx-auto">
                      <div className="flex items-center gap-3">
                        <Video className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <p className="text-xs font-semibold">{uploadedFile.name}</p>
                          <p className="text-[10px] text-muted-foreground">{uploadedFile.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 mx-auto"
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                        <Upload className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-semibold">Choose video file to test</span>
                      <span className="text-xs text-muted-foreground">MP4, MOV, WebM up to 500 MB</span>
                    </button>
                  )}
                </div>
            </section>

            {/* Step 2: Test Details */}
            <section className="card-surface p-5 rounded-2xl space-y-4">
              <h2 className="flex items-center gap-2.5 text-base font-semibold">
                <Num>2</Num> Test Details & Instructions
              </h2>

              <div>
                <label className="block text-xs font-medium">
                  Test Title <span className="text-destructive">*</span>
                </label>
                <input
                  required
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Checkout Redesign Concept"
                  className="mt-1.5 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Instructions for Testers</label>
                <textarea
                  value={description}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what the participant should expect or focus on..."
                  className="mt-1.5 w-full resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-ring"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-pop hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <PlusCircle className="h-4 w-4" />
                  {isSubmitting ? "Creating Session..." : "Create Test & Generate Participant Link"}
                </button>
              </div>
            </section>
          </form>

          {/* Step 3: Generated Link Card */}
          {createdSession && (
            <section className="card-surface p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Test Created Successfully!</span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  Session ID: {createdSession.id}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                Your test is ready. Send this link to participants so they can watch your video and
                record their reactions.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  readOnly
                  value={testLink}
                  className="min-w-0 flex-1 rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm font-mono"
                />
                <button
                  onClick={() => {
                    void navigator.clipboard?.writeText(testLink);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy Link"}
                </button>
              </div>

              {/* Direct Handoff Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={`/test/${createdSession.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-input bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-primary" /> Open Link as Participant
                </Link>
                <Link
                  to="/dashboard"
                  search={{ session: createdSession.id }}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/80"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> View Stats in Dashboard
                </Link>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Info Column */}
        <div className="space-y-6">
          <section className="card-surface p-5 rounded-2xl">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> How the User Test Works
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              What your participants experience when they open the test link:
            </p>
            <ol className="mt-4 space-y-4">
              {steps.map((s) => (
                <li key={s.title} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-primary">
                    <s.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <span className="block text-xs font-semibold">{s.title}</span>
                    <span className="block text-[11px] leading-relaxed text-muted-foreground">
                      {s.body}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="card-surface p-5 rounded-2xl">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Live Stats in Dashboard
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Once users complete the test, their reaction scores (valence, intensity, emotion
              categories) are immediately computed by the analytics service. You can review them on
              the Product Owner Dashboard and ask the AI agent questions about participant feedback.
            </p>
            <div className="mt-4">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
              >
                Go to Dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {children}
    </span>
  );
}
