"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type ShortcutEntry = {
  keys: string[];
  description: string;
};

const shortcutGroups: Array<{ title: string; shortcuts: ShortcutEntry[] }> = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["g", "h"], description: "Go to Home" },
      { keys: ["g", "n"], description: "Go to News" },
      { keys: ["g", "l"], description: "Go to Leaderboard" },
      { keys: ["g", "c"], description: "Go to Companies" },
    ],
  },
  {
    title: "Search",
    shortcuts: [
      { keys: ["/"], description: "Focus search" },
      { keys: ["⌘", "K"], description: "Open search modal" },
    ],
  },
  {
    title: "News",
    shortcuts: [
      { keys: ["j"], description: "Next news card" },
      { keys: ["k"], description: "Previous news card" },
      { keys: ["x"], description: "Expand / collapse card" },
      { keys: ["b"], description: "Bookmark card" },
    ],
  },
  {
    title: "General",
    shortcuts: [
      { keys: ["?"], description: "Show this shortcuts modal" },
      { keys: ["Esc"], description: "Close any modal / panel" },
    ],
  },
];

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-10 backdrop-blur-md surface-overlay"
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
    >
      <div className="surface-card-strong panel-shadow-strong w-full max-w-lg overflow-hidden rounded-[28px] border border-[var(--border)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--text-primary)]">
            Keyboard Shortcuts
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="mb-6 last:mb-0">
              <h3 className="mb-3 font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between gap-4 py-1"
                  >
                    <span className="text-sm text-[var(--text-secondary)]">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, index) => (
                        <span key={index}>
                          {index > 0 && key.length > 1 ? null : index > 0 ? (
                            <span className="mx-0.5 text-[var(--text-tertiary)]">+</span>
                          ) : null}
                          <kbd className="inline-flex min-w-[24px] items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 font-[family-name:var(--font-mono)] text-[11px] text-[var(--text-primary)]">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
