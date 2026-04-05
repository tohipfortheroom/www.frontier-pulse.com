"use client";

import { Keyboard } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ShortcutsModal } from "@/components/shortcuts-modal";

function isInputFocused() {
  const active = document.activeElement;

  if (!active) {
    return false;
  }

  const tag = active.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || (active as HTMLElement).isContentEditable;
}

const NAV_ROUTES: Record<string, string> = {
  h: "/",
  n: "/news",
  l: "/leaderboard",
  c: "/companies",
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [pendingG, setPendingG] = useState(false);

  const handleClose = useCallback(() => setShowModal(false), []);

  useEffect(() => {
    let gTimeout: ReturnType<typeof setTimeout> | null = null;

    function handleKeyDown(event: KeyboardEvent) {
      if (isInputFocused()) {
        return;
      }

      // ? → show shortcuts modal
      if (event.key === "?" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setShowModal((value) => !value);
        return;
      }

      // Escape → close modal
      if (event.key === "Escape") {
        setShowModal(false);
        return;
      }

      // / → focus search (Cmd+K is handled in GlobalSearch)
      if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        // Trigger the search modal by dispatching a Cmd+K event
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          }),
        );
        return;
      }

      // g + letter chord navigation
      if (event.key === "g" && !event.metaKey && !event.ctrlKey && !pendingG) {
        setPendingG(true);

        if (gTimeout) {
          clearTimeout(gTimeout);
        }

        gTimeout = setTimeout(() => {
          setPendingG(false);
        }, 500);

        return;
      }

      if (pendingG) {
        const route = NAV_ROUTES[event.key];

        if (route) {
          event.preventDefault();
          router.push(route);
        }

        setPendingG(false);

        if (gTimeout) {
          clearTimeout(gTimeout);
        }

        return;
      }

      // j/k → navigate news cards
      if (event.key === "j" || event.key === "k") {
        const cards = document.querySelectorAll<HTMLElement>("[data-news-card]");

        if (cards.length === 0) {
          return;
        }

        const currentIndex = Array.from(cards).findIndex(
          (card) => card.getAttribute("data-news-card-active") === "true",
        );

        let nextIndex: number;

        if (event.key === "j") {
          nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
        }

        cards.forEach((card) => card.removeAttribute("data-news-card-active"));
        const nextCard = cards[nextIndex];
        nextCard.setAttribute("data-news-card-active", "true");
        nextCard.scrollIntoView({ behavior: "smooth", block: "center" });
        nextCard.focus();
        return;
      }

      // x → expand/collapse active card
      if (event.key === "x") {
        const activeCard = document.querySelector<HTMLElement>("[data-news-card-active='true']");

        if (activeCard) {
          const expandButton = activeCard.querySelector<HTMLButtonElement>("[data-expand-toggle]");
          expandButton?.click();
        }

        return;
      }

      // b → bookmark active card
      if (event.key === "b" && !event.metaKey && !event.ctrlKey) {
        const activeCard = document.querySelector<HTMLElement>("[data-news-card-active='true']");

        if (activeCard) {
          const bookmarkButton = activeCard.querySelector<HTMLButtonElement>("[data-bookmark-toggle]");
          bookmarkButton?.click();
        }

        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      if (gTimeout) {
        clearTimeout(gTimeout);
      }
    };
  }, [pendingG, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="hidden rounded-full border border-[var(--border)] p-2 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] lg:inline-flex"
        title="Keyboard shortcuts (?)"
      >
        <Keyboard className="h-4 w-4" />
      </button>
      {showModal ? <ShortcutsModal onClose={handleClose} /> : null}
    </>
  );
}
