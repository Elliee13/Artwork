import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type CategoryTabsProps = {
  categories: string[];
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
            key={category}
            value={category}
            className="rounded-full bg-muted/40 px-4 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/60 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm"
          >
            {category}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
