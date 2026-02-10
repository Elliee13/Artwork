import { useEffect, useMemo, useState } from "react";

import Masonry from "@/components/Masonry";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  const lightboxOpen = lightboxIndex !== null;
  const activeIndex = lightboxIndex ?? 0;
  const activeItem = masonryItems[activeIndex];

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        setLightboxIndex((prev) => {
          if (prev === null) return prev;
          return (prev + 1) % masonryItems.length;
        });
      }
      if (event.key === "ArrowLeft") {
        setLightboxIndex((prev) => {
          if (prev === null) return prev;
          return (prev - 1 + masonryItems.length) % masonryItems.length;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, masonryItems.length]);

  useEffect(() => {
    setLightboxIndex(null);
  }, [categoryName]);

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
      <div className="space-y-3 rounded-3xl border border-border/40 bg-muted/15 p-8 sm:p-10 lg:p-12">
        <h3 className="font-display text-balance text-xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-2xl">
          No extractable artwork in this category yet.
        </h3>
        {notes ? (
          <p className="max-w-prose font-sans text-pretty text-sm leading-relaxed text-muted-foreground">{notes}</p>
        ) : null}
        <Separator className="bg-border/60" />
        {unsupportedObjectsDetected ? (
          <p className="font-sans text-xs text-muted-foreground/80 sm:text-sm">
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
        onItemClick={(item, index) => {
          if (item.url && item.url !== "noop") {
            window.open(item.url, "_blank", "noopener");
            return;
          }
          setLightboxIndex(index);
        }}
      />
      <Dialog open={lightboxOpen} onOpenChange={(open) => (open ? setLightboxIndex(activeIndex) : setLightboxIndex(null))}>
        <DialogContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{categoryName || "Gallery"}</DialogTitle>
            <DialogDescription>
              {masonryItems.length === 0 ? "0/0" : `${activeIndex + 1}/${masonryItems.length}`}
            </DialogDescription>
          </div>
          {activeItem ? (
            <div className="flex h-[75vh] items-center justify-center overflow-hidden rounded-xl bg-white/95">
              <img src={activeItem.img} alt="" className="max-h-full w-auto max-w-full object-contain" />
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setLightboxIndex((prev) => (prev === null ? prev : (prev - 1 + masonryItems.length) % masonryItems.length))
              }
              disabled={masonryItems.length === 0}
            >
              Previous
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLightboxIndex((prev) => (prev === null ? prev : (prev + 1) % masonryItems.length))}
              disabled={masonryItems.length === 0}
            >
              Next
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
