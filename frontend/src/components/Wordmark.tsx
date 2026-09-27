import { cn } from "@/lib/utils";

// The "Read The Room." wordmark: Sora bold, tight tracking, curtain-colored period.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display font-bold tracking-[-0.03em]", className)}>
      Read The Room<span className="text-primary">.</span>
    </span>
  );
}
