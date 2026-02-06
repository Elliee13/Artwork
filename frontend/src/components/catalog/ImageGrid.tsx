import { useMemo } from "react";

import Masonry from "@/components/Masonry";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type ImageGridProps = {
  imageUrls: string[];
  isLoading: boolean;
  categoryName: string;
  imagesCount: number;
  unsupportedObjectsDetected: boolean;
  notes?: string | null;
};

type MasonryItem = {
  id: string;
  img: string;
  url: string;
  height: number;
};

function getStableHeight(seedText: string, index: number): number {
  const seed = `${seedText}-${index}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return 220 + (hash % 220);
}

export default function ImageGrid({
  imageUrls,
  isLoading,
  categoryName,
  imagesCount,
  unsupportedObjectsDetected,
  notes,
}: ImageGridProps) {
  const masonryItems = useMemo<MasonryItem[]>(
    () =>
      imageUrls.map((url, index) => ({
        id: `${categoryName}-${index}`,
        img: url,
        url: "noop",
        height: getStableHeight(url, index),
      })),
    [categoryName, imageUrls]
  );

  if (isLoading) {
    return (
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4" aria-label="Loading artwork">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton
            key={index}
            className={`mb-4 w-full break-inside-avoid rounded-2xl md:rounded-3xl ${index % 3 === 0 ? "h-64" : index % 2 === 0 ? "h-80" : "h-56"}`}
          />
        ))}
      </div>
    );
  }

  if (imagesCount === 0) {
    return (
      <div className="space-y-3 rounded-3xl border border-border/50 bg-muted/20 p-8 sm:p-10 lg:p-12">
        <h3 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          No extractable artwork in this category yet.
        </h3>
        {notes ? <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{notes}</p> : null}
        <Separator className="bg-border/60" />
        {unsupportedObjectsDetected ? (
          <p className="text-xs text-muted-foreground/80 sm:text-sm">
            Some worksheet objects may be non-standard and not available as embedded images.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-3 text-left" aria-label="Artwork masonry gallery">
      {unsupportedObjectsDetected ? (
        <p className="text-xs text-muted-foreground/80 sm:text-sm">
          Additional worksheet objects were detected; only standard embedded images are displayed.
        </p>
      ) : null}
      <Masonry
        key={categoryName}
        items={masonryItems}
        animateFrom="bottom"
        blurToFocus
        scaleOnHover
        colorShiftOnHover={false}
        duration={0.75}
        stagger={0.04}
        initialDelay={0.32}
      />
    </div>
  );
}
