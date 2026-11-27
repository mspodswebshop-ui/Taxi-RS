"use client";

import { useState } from "react";

import { cx } from "@/components/ui";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return <div className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-ink-100 text-ink-400">Geen foto</div>;
  }
  return (
    <div>
      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-ink-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[active]} alt={alt} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={cx("aspect-square overflow-hidden rounded-lg border-2", i === active ? "border-ink-900" : "border-transparent opacity-70 hover:opacity-100")}
              aria-label={`Foto ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
