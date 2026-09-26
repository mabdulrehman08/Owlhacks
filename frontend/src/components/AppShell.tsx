import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BarChart3, CalendarClock, Info, Link2, Settings, Share2, ChevronDown } from "lucide-react";
import logo from "@/assets/logo.png";

const nav = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/sessions", label: "Sessions", icon: CalendarClock },
  { to: "/share", label: "Share Test", icon: Link2 },
  { to: "/setup", label: "Setup", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1500px]">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
          <Link to="/" className="mb-8 flex items-center gap-2.5 px-2">
            <img src={logo} alt="ReactionLens" width={32} height={32} className="h-8 w-8" />
            <span className="font-display text-lg font-semibold">ReactionLens</span>
          </Link>
          <nav className="flex flex-col gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
              >
                <Icon className="h-4.5 w-4.5" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="rounded-xl bg-muted p-3.5 text-xs leading-relaxed text-muted-foreground">
              <Info className="mb-2 h-4 w-4" />
              We detect observable expression changes (e.g. smiles, surprise, confusion). This is not
              mind reading.
            </div>
            <div className="flex items-center gap-2.5 border-t border-sidebar-border pt-4">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                JD
              </span>
              <div className="text-xs">
                <p className="font-semibold">Jordan Diaz</p>
                <p className="text-muted-foreground">Acme Co.</p>
              </div>
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex flex-wrap items-center gap-4 border-b border-border bg-card/85 px-5 py-4 backdrop-blur">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Project</p>
              <h2 className="truncate text-base font-semibold">Checkout Redesign Concept</h2>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center sm:flex">
                {["JD", "MK", "AS"].map((i, idx) => (
                  <span
                    key={i}
                    className="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-accent text-[11px] font-semibold text-accent-foreground"
                    style={{ marginLeft: idx ? -8 : 0 }}
                  >
                    {i}
                  </span>
                ))}
              </div>
              <Link
                to="/share"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop transition-colors hover:bg-primary/90"
              >
                <Share2 className="h-4 w-4" /> Share Test
              </Link>
            </div>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 lg:hidden">
            {nav.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
              >
                {label}
              </Link>
            ))}
          </nav>

          <main className="px-5 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
