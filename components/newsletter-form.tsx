"use client";

import { useState } from "react";

import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { pushToast } = useToast();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
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
          description: "You’re on the list for the AI Company Tracker digest.",
        });
      }

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
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onSubmit}>
      <Input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email address"
        className="flex-1"
      />
      <Button type="submit" variant="primary" className="sm:min-w-[150px]" disabled={isLoading}>
        {isLoading ? "Subscribing..." : "Subscribe"}
      </Button>
    </form>
  );
}
