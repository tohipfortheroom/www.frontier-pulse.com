"use client";

import { Loader2, MessageSquareText, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/lib/hooks/use-network-status";
import { fetchWithTimeout } from "@/lib/network/fetch";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const GENERAL_QUESTIONS = [
  "What happened with OpenAI today?",
  "Compare Anthropic and Google momentum",
  "What's the most important story this week?",
  "Who is accelerating right now?",
  "What should I watch next?",
];

const COMPANY_QUESTIONS = [
  "What's driving their momentum?",
  "How do they compare to competitors?",
  "What are their biggest risks?",
  "What launched recently?",
  "What should I watch for next?",
];

const SESSION_LIMIT = 20;
const STORAGE_MESSAGES = "frontier-pulse-chat-messages";
const STORAGE_COUNT = "frontier-pulse-chat-count";
const STORAGE_SESSION_ID = "frontier-pulse-chat-session-id";

function getCompanySlugFromPathname(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "companies" && segments[1] ? segments[1] : null;
}

export function ChatWidget() {
  const pathname = usePathname();
  const companySlug = getCompanySlugFromPathname(pathname);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const isOnline = useNetworkStatus();
  const { pushToast } = useToast();
  const remaining = SESSION_LIMIT - messageCount;
  const starterQuestions = useMemo(() => (companySlug ? COMPANY_QUESTIONS : GENERAL_QUESTIONS), [companySlug]);

  useEffect(() => {
    const storedMessages = window.sessionStorage.getItem(STORAGE_MESSAGES);
    const storedCount = window.sessionStorage.getItem(STORAGE_COUNT);
    const storedSessionId = window.sessionStorage.getItem(STORAGE_SESSION_ID);

    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages) as ChatMessage[]);
      } catch {
        window.sessionStorage.removeItem(STORAGE_MESSAGES);
      }
    }

    setMessageCount(storedCount ? Number(storedCount) : 0);
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const nextSessionId = crypto.randomUUID();
      window.sessionStorage.setItem(STORAGE_SESSION_ID, nextSessionId);
      setSessionId(nextSessionId);
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const element = scrollerRef.current;

    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, isOpen]);

  function clearChat() {
    setMessages([]);
    setMessageCount(0);
    setError(null);
    window.sessionStorage.removeItem(STORAGE_MESSAGES);
    window.sessionStorage.removeItem(STORAGE_COUNT);
  }

  async function sendMessage(question: string) {
    const trimmed = question.trim();

    if (!trimmed || isLoading || remaining <= 0 || !isOnline) {
      return;
    }

    const nextUserMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, nextUserMessage];
    const nextCount = messageCount + 1;

    setInput("");
    setError(null);
    setIsLoading(true);
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setMessageCount(nextCount);
    window.sessionStorage.setItem(STORAGE_COUNT, String(nextCount));

    const resolvedSessionId = sessionId || crypto.randomUUID();
    if (!sessionId) {
      setSessionId(resolvedSessionId);
      window.sessionStorage.setItem(STORAGE_SESSION_ID, resolvedSessionId);
    }

    try {
      const response = await fetchWithTimeout("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-chat-session-id": resolvedSessionId,
        },
        body: JSON.stringify({
          slug: companySlug ?? undefined,
          messages: nextMessages,
        }),
        timeoutMs: 30_000,
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "The analyst desk is temporarily unavailable.");
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
      const message = caughtError instanceof Error ? caughtError.message : "Something went wrong.";
      setError(message);
      pushToast({
        tone: "error",
        title: "Analyst unavailable",
        description: message,
      });
      const restoredCount = Math.max(0, nextCount - 1);
      setMessageCount(restoredCount);
      window.sessionStorage.setItem(STORAGE_COUNT, String(restoredCount));
    } finally {
      setIsLoading(false);
    }
  }

  const canSend = input.trim().length > 0 && !isLoading && remaining > 0 && isOnline;

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {isOpen ? (
        <div className="surface-card-strong panel-shadow-strong flex h-[min(500px,calc(100vh-2rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-[var(--accent-blue-border)] backdrop-blur-xl">
          <div className="surface-inline border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--accent-blue)]">
                  Frontier Pulse Analyst
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                  Ask the board
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Answers grounded in the latest rankings, stories, and company context.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearChat}
                  className="rounded-full border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                  aria-label="Clear chat history"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-[var(--border)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div ref={scrollerRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {!isOnline ? (
              <div className="rounded-2xl border border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] px-4 py-3 text-sm text-[var(--accent-red)]">
                Chat unavailable — you&apos;re offline.
              </div>
            ) : null}

            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--accent-purple-border)] bg-[var(--accent-purple-soft)] p-4">
                  <div className="flex items-center gap-2 text-[var(--accent-purple)]">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.14em]">Starter Questions</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
                    Ask about the AI race overall{companySlug ? ", or get a company-specific read" : ""}.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {starterQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendMessage(question)}
                      className="surface-soft rounded-full border border-[var(--border)] px-4 py-2 text-left text-sm text-[var(--text-secondary)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent-blue-border)] hover:text-[var(--text-primary)]"
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
                    ? "ml-8 border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--text-primary)]"
                    : "mr-8 border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)]",
                )}
              >
                <p className="mb-2 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  {message.role === "user" ? "You" : "Analyst"}
                </p>
                <p>{message.content || (isLoading && index === messages.length - 1 ? "Thinking…" : "")}</p>
              </div>
            ))}

            {error ? (
              <div className="rounded-2xl border border-[var(--accent-red-border)] bg-[var(--accent-red-soft)] px-4 py-3 text-sm text-[var(--accent-red)]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--border)] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                {!isOnline
                  ? "Reconnect to use chat"
                  : remaining > 0
                    ? `${remaining} messages left this session`
                    : "Session message limit reached"}
              </p>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-blue)]" /> : null}
            </div>

            <div className="mt-3 flex gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={!isOnline}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage(input);
                  }
                }}
                rows={3}
                placeholder={companySlug ? "Ask about this company..." : "Ask about the AI race..."}
                className="surface-inline min-h-[5.5rem] w-full resize-none rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all duration-200 placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue-border)] focus:ring-2 focus:ring-[var(--accent-blue-ring)] disabled:cursor-not-allowed disabled:opacity-60"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!canSend}
                className="h-auto min-w-[3rem] self-end px-3 py-3"
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
          className="surface-card-strong panel-shadow-strong flex items-center gap-3 rounded-full border border-[var(--accent-blue-border)] px-4 py-3 text-[var(--text-primary)] transition-transform duration-200 hover:-translate-y-0.5"
          aria-label="Open chat assistant"
        >
          <MessageSquareText className="h-5 w-5 text-[var(--accent-blue)]" />
          <span className="hidden text-sm font-medium sm:inline">Ask Frontier Pulse</span>
        </button>
      )}
    </div>
  );
}
