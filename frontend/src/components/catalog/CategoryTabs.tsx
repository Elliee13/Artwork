import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CategoryTabsProps = {
  categories: Array<{ name: string; imagesCount: number }>;
  activeCategory: string;
  onChange: (categoryName: string) => void;
};

export default function CategoryTabs({
  categories,
  activeCategory,
  onChange,
}: CategoryTabsProps) {
  return (
    <Tabs value={activeCategory} onValueChange={onChange}>
      <TabsList className="mt-8 flex w-full flex-wrap justify-center gap-2 sm:gap-3">
        {categories.map((category) => (
          <TabsTrigger
            key={category.name}
            value={category.name}
            className="rounded-full border border-transparent bg-muted/40 px-4 py-2 font-sans text-[13px] font-medium tracking-[-0.01em] text-foreground/80 transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:border-border/30 data-[state=active]:bg-foreground data-[state=active]:font-medium data-[state=active]:text-background data-[state=active]:shadow-sm sm:text-sm"
          >
            <span>{category.name}</span>
            <span
              className={`ml-2 rounded-full px-2 py-0.5 font-sans text-[11px] leading-none ${
                category.imagesCount > 0
                  ? "bg-background/70 text-foreground/80 data-[state=active]:bg-background/25 data-[state=active]:text-background"
                  : "bg-muted-foreground/20 text-muted-foreground/80"
              }`}
              aria-label={`${category.imagesCount} images`}
            >
              {category.imagesCount}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
