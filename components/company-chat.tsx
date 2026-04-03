"use client";

import { Loader2, MessageSquareText, Send, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const STARTER_QUESTIONS = [
  "What's driving their momentum?",
  "How do they compare to competitors?",
  "What are their biggest risks?",
  "What launched recently?",
  "What should I watch for next?",
];

const SESSION_LIMIT = 20;
const SESSION_STORAGE_KEY = "ai-company-chat-message-count";

export function CompanyChat({ companySlug, companyName }: { companySlug: string; companyName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const remaining = SESSION_LIMIT - messageCount;

  useEffect(() => {
    const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    setMessageCount(stored ? Number(stored) : 0);
  }, []);

  useEffect(() => {
    const element = scrollerRef.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, isOpen]);

  const disabled = isLoading || remaining <= 0;
  const canSend = input.trim().length > 0 && !disabled;
  const starterQuestions = useMemo(() => STARTER_QUESTIONS.filter((question) => !messages.some((message) => message.content === question)), [messages]);

  async function sendMessage(question: string) {
    const trimmed = question.trim();

    if (!trimmed || disabled) {
      return;
    }

    const nextUserMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, nextUserMessage];
    setInput("");
    setError(null);
    setIsLoading(true);
    setMessages([...nextMessages, { role: "assistant", content: "" }]);

    const nextCount = messageCount + 1;
    setMessageCount(nextCount);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, String(nextCount));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug: companySlug,
          messages: nextMessages,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "The company analyst is temporarily unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let complete = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        complete += decoder.decode(value, { stream: true });

        setMessages((current) => {
          const next = [...current];
          next[next.length - 1] = {
            role: "assistant",
            content: complete,
          };
          return next;
        });
      }

      setMessages((current) => {
        const next = [...current];
        next[next.length - 1] = {
          role: "assistant",
          content: complete.trim() || "I couldn't generate a useful answer from the current context.",
        };
        return next;
      });
    } catch (caughtError) {
      setMessages(nextMessages);
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
      const restoredCount = Math.max(0, nextCount - 1);
      setMessageCount(restoredCount);
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, String(restoredCount));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
      {isOpen ? (
        <div className="overflow-hidden rounded-3xl border border-[rgba(77,159,255,0.22)] bg-[rgba(18,18,26,0.95)] shadow-[0_18px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="border-b border-[var(--border)] bg-[rgba(10,10,15,0.6)] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-blue)]">
                  Ask About This Company
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                  {companyName}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Concise answers grounded in the company profile and recent coverage.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                aria-label="Close company chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={scrollerRef} className="max-h-[26rem] space-y-4 overflow-y-auto px-5 py-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[rgba(167,139,250,0.24)] bg-[rgba(167,139,250,0.08)] p-4">
                  <div className="flex items-center gap-2 text-[var(--accent-purple)]">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em]">Starter Questions</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    Use one of these to get a fast analyst read, or ask your own question below.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {starterQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendMessage(question)}
                      className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-left text-sm text-[var(--text-secondary)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(77,159,255,0.3)] hover:text-[var(--text-primary)]"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-6",
                  message.role === "user"
                    ? "ml-8 border border-[rgba(77,159,255,0.24)] bg-[rgba(77,159,255,0.08)] text-[var(--text-primary)]"
                    : "mr-8 border border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)]",
                )}
              >
                <p className="mb-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  {message.role === "user" ? "You" : "AI Analyst"}
                </p>
                <p>{message.content || (isLoading && index === messages.length - 1 ? "Thinking…" : "")}</p>
              </div>
            ))}

            {error ? (
              <div className="rounded-2xl border border-[rgba(255,77,106,0.22)] bg-[rgba(255,77,106,0.08)] px-4 py-3 text-sm text-[var(--accent-red)]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--border)] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                {remaining > 0 ? `${remaining} messages left this session` : "Session message limit reached"}
              </p>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-blue)]" /> : null}
            </div>

            <div className="mt-3 flex gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
                rows={3}
                placeholder={`Ask about ${companyName}...`}
                className="min-h-[5.5rem] w-full resize-none rounded-2xl border border-[var(--border)] bg-[rgba(10,10,15,0.72)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-tertiary)] focus:border-[rgba(77,159,255,0.45)] focus:ring-2 focus:ring-[rgba(77,159,255,0.12)]"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!canSend}
                className={cn("h-auto min-w-[3rem] self-end px-3 py-3", !canSend && "cursor-not-allowed")}
                onClick={() => void sendMessage(input)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            buttonVariants({ variant: "primary", className: "ml-auto flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 sm:w-auto" }),
          )}
        >
          <MessageSquareText className="h-4 w-4" />
          Ask About {companyName}
        </button>
      )}
    </div>
  );
}
