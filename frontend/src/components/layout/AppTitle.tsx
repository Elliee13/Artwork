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
      className="text-sm font-medium text-muted-foreground sm:text-base"
      textAlign="center"
    />
  );
}
