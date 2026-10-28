"use client";

import { useState } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  hint: string;
}

type Sticker = {
  id: string;
  emoji: string;
  rotateClass: string;
};

const STICKERS: Sticker[] = [
  { id: "wave", emoji: "👋", rotateClass: "-rotate-6" },
  { id: "spark", emoji: "✨", rotateClass: "rotate-6" },
  { id: "coffee", emoji: "☕", rotateClass: "-rotate-3" },
  { id: "rocket", emoji: "🚀", rotateClass: "rotate-3" },
  { id: "party", emoji: "🎉", rotateClass: "-rotate-2" },
  { id: "idea", emoji: "💡", rotateClass: "rotate-2" },
  { id: "heart", emoji: "💛", rotateClass: "-rotate-6" },
  { id: "sun", emoji: "🌞", rotateClass: "rotate-6" },
  { id: "ok", emoji: "👌", rotateClass: "-rotate-3" },
];

const pickRandomStickers = (count: number) => {
  const random = [...STICKERS]
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.min(count, STICKERS.length));
  return random;
};

export default function EmptyState({
  title,
  description,
  hint,
}: EmptyStateProps) {
  const [stickers, setStickers] = useState<Sticker[]>(() =>
    STICKERS.slice(0, 6),
  );
  const [activeSticker, setActiveSticker] = useState("");

  return (
    <section className="flex h-full min-h-0 flex-col items-center justify-center gap-6 bg-white px-6 py-10 text-center">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#111827]">{title}</h2>
        <p className="mx-auto max-w-md text-sm text-[#6b7280]">{description}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {stickers.map((sticker) => {
          const isActive = activeSticker === sticker.id;
          return (
            <button
              key={sticker.id}
              type="button"
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f3f4f6] bg-[#fffdf3] text-2xl shadow-[0_8px_18px_rgba(245,158,11,0.12)] transition-transform duration-300 ${
                sticker.rotateClass
              } ${isActive ? "scale-110 animate-bounce" : "hover:scale-105"}`}
              onClick={() => {
                setActiveSticker(sticker.id);
                setStickers(pickRandomStickers(6));
                window.setTimeout(() => {
                  setActiveSticker((current) =>
                    current === sticker.id ? "" : current,
                  );
                }, 550);
              }}
              aria-label={`Sticker ${sticker.id}`}
            >
              {sticker.emoji}
            </button>
          );
        })}
      </div>

      <p className="rounded-full border border-[#fef3c7] bg-[#fffbeb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#b45309]">
        {hint}
      </p>
    </section>
  );
}
