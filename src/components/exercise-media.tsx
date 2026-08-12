"use client";

import { useState } from "react";
import { ListOrdered } from "lucide-react";

interface ExerciseMediaProps {
  exerciseName: string;
  gifUrl?: string;
  instructions?: string[];
}

/**
 * Shared ExerciseDB media block — demo GIF thumbnail + step-by-step
 * instructions. Only renders when at least one is present (catalog-picked
 * exercises). The GIF is lazy-loaded and falls back gracefully if it fails
 * (the ExerciseDB API rotates gifUrl periodically).
 */
export function ExerciseMedia({
  exerciseName,
  gifUrl,
  instructions,
}: ExerciseMediaProps) {
  const [gifFailed, setGifFailed] = useState(false);

  const hasGif = Boolean(gifUrl) && !gifFailed;
  const hasInstructions = (instructions?.length ?? 0) > 0;

  if (!hasGif && !hasInstructions) return null;

  return (
    <div className="relative mt-4 flex flex-col gap-4 sm:flex-row">
      {hasGif && (
        <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[rgba(68,73,51,0.2)] bg-[#0c0f04]/80 sm:w-40">
          {/* eslint-disable-next-line @next/next/no-img-element -- animated GIFs can't go through next/image's optimizer (it converts to webp/avif and kills the animation) */}
          <img
            src={gifUrl}
            alt={`${exerciseName} demo`}
            loading="lazy"
            decoding="async"
            onError={() => setGifFailed(true)}
            className="h-28 w-full object-cover sm:h-auto"
          />
        </div>
      )}

      {hasInstructions && (
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-label-caps text-[10px] font-medium uppercase tracking-wider text-[#c4c9ac]">
            <ListOrdered className="size-3 text-[#abd600]" />
            How to perform
          </p>
          <ol className="mt-2 flex flex-col gap-1.5">
            {instructions!.map((step, i) => (
              <li
                key={i}
                className="flex gap-2 text-xs leading-relaxed text-[#c4c9ac]"
              >
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#abd600]/10 text-[10px] font-bold text-[#abd600]">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
