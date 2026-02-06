import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { Separator } from "@/components/ui/separator";

type CategoryHeaderProps = {
  categoryName: string;
  imagesCount: number;
  unsupportedObjectsDetected: boolean;
};

export default function CategoryHeader({
  categoryName,
  imagesCount,
  unsupportedObjectsDetected,
}: CategoryHeaderProps) {
  const headerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!headerRef.current) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        headerRef.current,
        { autoAlpha: 0, y: 10, filter: "blur(6px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.76,
          ease: "expo.out",
        }
      );
    }, headerRef);

    return () => ctx.revert();
  }, [categoryName]);

  return (
    <div ref={headerRef} className="space-y-2.5 text-center">
      <h2 className="text-3xl font-semibold leading-[1.05] tracking-tight text-foreground/95 sm:text-4xl lg:text-[44px]">
        {categoryName || "Gallery"}
      </h2>
      <p className="mt-2 text-sm font-normal leading-relaxed text-muted-foreground sm:text-base">
        {imagesCount} {imagesCount === 1 ? "image" : "images"}
      </p>
      {unsupportedObjectsDetected ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80 sm:text-sm">
          Some worksheet objects may not be standard embedded images.
        </p>
      ) : null}
      <Separator className="mx-auto mt-6 w-24 bg-border/50" />
    </div>
  );
}
