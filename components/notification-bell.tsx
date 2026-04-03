"use client";

import { Bell, BellRing } from "lucide-react";
import { useEffect, useState } from "react";

import { useToast } from "@/components/toast-provider";
import { cn } from "@/lib/utils";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export function NotificationBell() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { pushToast } = useToast();

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    setEnabled(Notification.permission === "granted");
  }, []);

  async function enableNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      pushToast({
        tone: "error",
        title: "Notifications unavailable",
        description: "This browser does not support web push notifications.",
      });
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      pushToast({
        tone: "error",
        title: "Missing VAPID key",
        description: "Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to enable browser push subscriptions.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      const registration = await navigator.serviceWorker.register("/notifications-sw.js");
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save push subscription.");
      }

      setEnabled(true);
      pushToast({
        tone: "success",
        title: "Breaking news alerts enabled",
        description: "You’ll get notified when a critical AI move lands in the tracker.",
      });
    } catch (error) {
      pushToast({
        tone: "error",
        title: "Notifications failed",
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void enableNotifications()}
      disabled={isLoading}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]",
        enabled && "border-[rgba(0,230,138,0.22)] bg-[rgba(0,230,138,0.08)] text-[var(--accent-green)]",
      )}
      aria-label={enabled ? "Breaking news alerts enabled" : "Enable breaking news alerts"}
    >
      {enabled ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
    </button>
  );
}
