"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND_NAME } from "@/lib/brand";
import { useNetworkStatus } from "@/lib/hooks/use-network-status";
import { fetchWithTimeout } from "@/lib/network/fetch";
import { cn } from "@/lib/utils";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { pushToast } = useToast();
  const isOnline = useNetworkStatus();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isOnline) {
      pushToast({
        tone: "error",
        title: "You're offline",
        description: "Reconnect to subscribe to the daily digest.",
      });
      return;
    }

    if (!email.trim()) {
      pushToast({
        tone: "error",
        title: "Email required",
        description: "Enter an email address to join the daily digest list.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchWithTimeout("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        timeoutMs: 10_000,
      });

      const payload = (await response.json().catch(() => null)) as { status?: string; error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to subscribe right now.");
      }

      if (payload?.status === "already-subscribed") {
        pushToast({
          tone: "success",
          title: "Already subscribed",
          description: "That email is already on the digest list.",
        });
      } else {
        pushToast({
          tone: "success",
          title: "Subscription saved",
          description: `You’re on the list for the ${BRAND_NAME} digest.`,
        });
      }

      setShowSuccess(true);
      window.setTimeout(() => setShowSuccess(false), 2200);
      setEmail("");
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Subscription failed",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="flex-1"
        />
        <Button type="submit" variant="primary" className="sm:min-w-[150px]" disabled={isLoading || !isOnline}>
          {isLoading ? "Subscribing..." : showSuccess ? "Subscribed" : "Subscribe"}
        </Button>
      </form>

      <div className="flex min-h-7 justify-center sm:justify-start">
        {!isOnline ? (
          <p className="text-sm text-[var(--accent-red)]">You&apos;re offline. Reconnect to subscribe.</p>
        ) : null}
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-[var(--accent-green-border)] bg-[var(--accent-green-soft)] px-3 py-1.5 text-sm text-[var(--accent-green)] transition-all duration-300",
            !isOnline && "hidden",
            showSuccess ? "animate-[successPop_600ms_cubic-bezier(0.22,1,0.36,1)] opacity-100" : "pointer-events-none translate-y-2 opacity-0",
          )}
        >
          <Check className="h-4 w-4" />
          <span>Subscription confirmed</span>
        </div>
      </div>
    </div>
  );
}
