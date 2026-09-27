import { useEffect, useRef, useState } from "react";
import { Bot, SendHorizontal } from "lucide-react";
import { sendChatMessage, type ChatMessage } from "@/lib/api";

export function SessionAgentChat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;

    // Add user message
    setMessages((m) => [...m, { role: "user", content: q }]);
    setValue("");
    setLoading(true);

    try {
      const response = await sendChatMessage(sessionId, q, messages);
      setMessages((m) => [...m, { role: "assistant", content: response.answer }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
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
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Start a conversation by asking a question about the session reactions...
          </p>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <p
              key={i}
              className="ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm text-primary-foreground"
            >
              {m.content}
            </p>
          ) : (
            <div key={i} className="flex gap-2">
              <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-info-soft text-primary">
                <Bot className="h-4 w-4" />
              </span>
              <p className="max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 text-sm leading-relaxed">
                {m.content}
              </p>
            </div>
          ),
        )}
        {loading && (
          <div className="flex gap-2">
            <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-info-soft text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <p className="max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 text-sm text-muted-foreground">
              Thinking...
            </p>
          </div>
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
          disabled={loading}
          placeholder="Ask a question about this session..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          aria-label="Send"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
