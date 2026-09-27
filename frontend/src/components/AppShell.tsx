import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Activity,
  CalendarClock,
  ExternalLink,
  Info,
  PlusCircle,
  Video,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Wordmark } from "@/components/Wordmark";

const nav = [
  { to: "/sessions", label: "Sessions", icon: CalendarClock },
  { to: "/share", label: "Submit Video & Test", icon: PlusCircle },
  { to: "/live", label: "Live Face Tracker", icon: Activity },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1500px]">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
          <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
            <img src={logo} alt="Read The Room" width={32} height={32} className="h-8 w-8" />
            <div>
              <Wordmark className="text-lg" />
              <span className="eyebrow block text-[10px]">Product Owner Portal</span>
            </div>
          </Link>

          <nav className="flex flex-col gap-1.5">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-xl border border-sidebar-border bg-card/50 p-3 text-xs leading-relaxed text-muted-foreground">
              <Info className="mb-1.5 h-4 w-4 text-primary" />
              Facial expression signals (joy, surprise, frustration, confusion) are detected locally
              via MediaPipe vision models.
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="min-w-0 flex-1">
          {/* Header */}
          <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/85 px-6 py-3.5 backdrop-blur">
            <div className="min-w-0">
              <span className="eyebrow text-[11px]">Platform</span>
              <h2 className="truncate text-sm font-semibold">Video Testing & Reaction Analytics</h2>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/test/$sessionId"
                params={{ sessionId: "demo" }}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-primary" /> Open Link as Participant
              </Link>
              <Link
                to="/share"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-pop transition-colors hover:bg-primary/90"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Create Test
              </Link>
            </div>
          </header>

          {/* Mobile Nav */}
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 lg:hidden">
            {nav.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>

          <main className="px-6 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
