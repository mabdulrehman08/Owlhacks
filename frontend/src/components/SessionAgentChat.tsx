import { useEffect, useRef, useState } from "react";
import { Bot, SendHorizontal } from "lucide-react";
import { AGENT_REPLIES } from "@/lib/reaction-data";

type Msg = { role: "user" | "agent"; text: string };

const FALLBACK =
  "In this session the notable expression changes are at 1:34 (smile), 2:07 (surprise), 3:12 (confusion) and 3:46 (neutral). Ask about any of those moments and I'll walk you through what was observed.";

export function SessionAgentChat() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "user", text: AGENT_REPLIES[0]!.q },
    { role: "agent", text: AGENT_REPLIES[0]!.a },
    { role: "user", text: AGENT_REPLIES[1]!.q },
    { role: "agent", text: AGENT_REPLIES[1]!.a },
  ]);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    const hit = AGENT_REPLIES.find((r) =>
      q.toLowerCase().split(/\s+/).some((w) => w.length > 3 && r.q.toLowerCase().includes(w)),
    );
    setMessages((m) => [...m, { role: "user", text: q }, { role: "agent", text: hit?.a ?? FALLBACK }]);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <section className="card-surface flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-info-soft text-primary">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold">Ask the Session Agent</h3>
          <p className="text-xs text-muted-foreground">
            Get insights, summaries, or specific questions about this session.
          </p>
        </div>
      </div>

      <div className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <p
              key={i}
              className="ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground"
            >
              {m.text}
            </p>
          ) : (
            <div key={i} className="flex gap-2">
              <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-info-soft text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <p className="max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 text-sm leading-relaxed">
                {m.text}
              </p>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        className="mt-4 flex items-center gap-2 rounded-xl border border-input bg-card px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(value);
        }}
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask a question about this session..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Send"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
