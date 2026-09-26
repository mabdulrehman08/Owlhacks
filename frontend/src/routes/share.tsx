import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  Camera,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Globe,
  Info,
  Link2,
  Lock,
  Mail,
  Play,
  QrCode,
  Sun,
  Upload,
  Users,
  X,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import preview from "@/assets/session-frame.jpg";

export const Route = createFileRoute("/share")({
  head: () => ({
    meta: [
      { title: "Create a Shareable Test | ReactionLens" },
      {
        name: "description",
        content:
          "Upload a video, set the test details, and generate a shareable link so participants can record their reactions.",
      },
      { property: "og:title", content: "Create a Shareable Test | ReactionLens" },
      {
        property: "og:description",
        content:
          "Product owners upload testable content and send a link to users and testers — no account required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShareTest,
});

const audiences = ["General consumers", "Existing customers", "Internal team", "Designers & researchers"];

const visibility = [
  { id: "link", icon: Globe, title: "Anyone with the link", sub: "No account required" },
  { id: "invite", icon: Link2, title: "Invite only", sub: "Only people with the link can participate" },
  { id: "private", icon: Lock, title: "Private (team only)", sub: "Only members of your workspace" },
];

const steps = [
  { icon: FileText, title: "Give Consent", body: "Participants review a short consent notice about facial reaction analysis." },
  { icon: Camera, title: "Allow Camera Access", body: "They enable their camera so we can detect facial expressions (processed in real time, not stored as video)." },
  { icon: Sun, title: "Lighting Check", body: "A quick check ensures good lighting for accurate results." },
  { icon: Play, title: "Watch Your Video", body: "They watch your content and their reactions are recorded as they go." },
  { icon: CheckCircle2, title: "Submit", body: "The session is complete! Their reactions are securely analyzed and added to your project results." },
];

function ShareTest() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; size: string } | null>({
    name: "checkout-concept-v1.mp4",
    size: "1:42 · 128 MB",
  });
  const [name, setName] = useState("Checkout Redesign Concept");
  const [description, setDescription] = useState(
    "We're testing a new checkout experience. Watch the short video and share your honest reactions.",
  );
  const [audience, setAudience] = useState(audiences[0]);
  const [who, setWho] = useState("link");
  const [copied, setCopied] = useState(false);

  const link = "https://app.reactionlens.com/t/ck9f2a7b3";

  return (
    <AppShell>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">Create a Shareable Test</h1>
            <p className="text-sm text-muted-foreground">
              Upload your content, set up a few details, and generate a shareable link for participants.
            </p>
          </div>

          <section className="card-surface p-5">
            <header className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2.5 text-base font-semibold">
                <Num>1</Num> Upload Testable Content
              </h2>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="h-4 w-4" /> Videos for now
              </span>
            </header>

            <div className="grid gap-4 rounded-2xl border border-dashed border-input p-4 md:grid-cols-2">
              <button
                onClick={() => fileInput.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-xl px-4 py-8 text-center transition-colors hover:bg-muted"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-info-soft text-primary">
                  <Upload className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">Drag and drop a video here</span>
                <span className="text-xs text-primary">or click to browse</span>
                <span className="mt-2 text-[11px] text-muted-foreground">
                  MP4, MOV, or WebM · Max 2 GB · Recommended 16:9 (1080p) · 15s – 10min
                </span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile({ name: f.name, size: `${(f.size / 1_048_576).toFixed(0)} MB` });
                }}
              />

              {file && (
                <div>
                  <div className="relative overflow-hidden rounded-xl border border-border">
                    <img src={preview} alt="" width={1280} height={720} loading="lazy" className="aspect-video w-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-card/90">
                        <Play className="h-5 w-5" />
                      </span>
                    </span>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      aria-label="Remove video"
                      className="grid h-7 w-7 place-items-center rounded-lg border border-border hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section className="card-surface p-5">
              <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold">
                <Num>2</Num> Test Details
              </h2>
              <label className="block text-xs font-medium">
                Test Name <span className="text-destructive">*</span>
                <input
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </label>
              <p className="mt-1 text-right text-[11px] text-muted-foreground">{name.length}/100</p>

              <label className="mt-2 block text-xs font-medium">
                Description
                <textarea
                  value={description}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1.5 w-full resize-none rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </label>
              <p className="mt-1 text-right text-[11px] text-muted-foreground">{description.length}/500</p>

              <label className="mt-2 block text-xs font-medium">
                Audience
                <span className="relative mt-1.5 flex items-center">
                  <Users className="absolute left-3 h-4 w-4 text-muted-foreground" />
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-input bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-ring"
                  >
                    {audiences.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </span>
              </label>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Who are you looking to get feedback from?
              </p>
            </section>

            <section className="card-surface p-5">
              <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold">
                <Num>3</Num> Share Settings
              </h2>
              <p className="mb-3 text-xs font-medium">Who can take this test?</p>
              <div className="space-y-2.5">
                {visibility.map((v) => {
                  const active = who === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setWho(v.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${
                        active ? "border-primary bg-info-soft" : "border-border hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
                          active ? "border-primary" : "border-input"
                        }`}
                      >
                        {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <v.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{v.title}</span>
                        <span className="block text-xs text-muted-foreground">{v.sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="card-surface p-5">
            <h2 className="flex items-center gap-2.5 text-base font-semibold">
              <Num>4</Num> Generate Shareable Link
            </h2>
            <p className="ml-9 text-xs text-muted-foreground">
              Your test is ready to share. Send this link to participants to start collecting reactions.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className="text-xs font-medium">Test Link</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    readOnly
                    value={link}
                    className="min-w-0 flex-1 rounded-xl border border-input bg-muted px-3 py-2.5 text-sm"
                  />
                  <button
                    onClick={() => {
                      void navigator.clipboard?.writeText(link);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy Link"}
                  </button>
                </div>
                <p className="mt-4 text-xs font-medium">Share via</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { icon: Mail, label: "Email" },
                    { icon: Link2, label: "Copy Link" },
                    { icon: Globe, label: "LinkedIn" },
                    { icon: Globe, label: "X (Twitter)" },
                  ].map((s) => (
                    <button
                      key={s.label}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-sm hover:bg-muted"
                    >
                      <s.icon className="h-4 w-4 text-muted-foreground" /> {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-2xl border border-border p-4">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <QrCode className="h-4 w-4" /> QR Code
                </span>
                <QrCode className="h-24 w-24" strokeWidth={1} />
                <span className="text-[11px] text-muted-foreground">Scan to open test</span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="text-base font-semibold">Participant Experience</h2>
            <p className="text-xs text-muted-foreground">
              Here's what participants will experience when they open your test link.
            </p>
            <ol className="mt-4 space-y-4">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-info-soft text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted">
                    <s.icon className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{s.title}</span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">{s.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card-surface p-5">
            <h3 className="text-sm font-semibold">Upload testable content: videos for now</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              We currently support video content (MP4, MOV, WebM). More content types (e.g. images,
              prototypes) are coming soon.
            </p>
          </section>

          <section className="card-surface p-5">
            <h3 className="text-sm font-semibold">Observable facial reactions</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              ReactionLens detects observable changes in facial expressions (e.g. smiles, surprise,
              confusion). This provides signals about engagement and emotional response — not a direct
              measure of thoughts or intent.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-info-soft text-xs font-semibold text-primary">
      {children}
    </span>
  );
}
