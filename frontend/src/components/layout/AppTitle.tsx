import SplitText from "@/components/SplitText";

export default function AppTitle() {
  return (
    <SplitText
      text="Artwork Viewer"
      tag="h1"
      splitType="words"
      delay={32}
      duration={0.6}
      from={{ opacity: 0, y: 10 }}
      to={{ opacity: 1, y: 0 }}
      className="font-display text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-foreground/95 sm:text-5xl lg:text-6xl"
      textAlign="center"
    />
  );
}
