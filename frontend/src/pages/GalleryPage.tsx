import { useEffect, useMemo, useState } from "react";

import CategoryHeader from "@/components/catalog/CategoryHeader";
import CategoryTabs from "@/components/catalog/CategoryTabs";
import ImageGrid from "@/components/catalog/ImageGrid";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { fetchCatalog, toAbsoluteImageUrl, type CatalogCategory } from "@/services/catalogApi";

type CatalogCategoryView = CatalogCategory & {
  images_count?: number;
  unsupported_objects_detected?: boolean | number;
  notes?: string | null;
};

export default function GalleryPage() {
  const [categories, setCategories] = useState<CatalogCategoryView[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedCategories = await fetchCatalog(controller.signal);
        // Backward-safe normalization: frontend remains compatible if fields are absent.
        const normalized = fetchedCategories.map((category) => {
          const unsafeCategory = category as CatalogCategoryView;
          return {
            ...category,
            images_count:
              typeof unsafeCategory.images_count === "number"
                ? unsafeCategory.images_count
                : category.images.length,
            unsupported_objects_detected: Boolean(unsafeCategory.unsupported_objects_detected),
            notes: typeof unsafeCategory.notes === "string" ? unsafeCategory.notes : null,
          };
        });
        setCategories(normalized);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load artwork catalog.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadCatalog();

    return () => controller.abort();
  }, [refreshTick]);

  useEffect(() => {
    if (categories.length === 0) {
      setActiveCategory("");
      return;
    }

    if (!activeCategory || !categories.some((item) => item.name === activeCategory)) {
      setActiveCategory(categories[0].name);
    }
  }, [categories, activeCategory]);

  const activeData = useMemo(
    () => categories.find((category) => category.name === activeCategory),
    [categories, activeCategory]
  );

  const images = useMemo(
    () => (activeData?.images ?? []).map((imageUrl) => toAbsoluteImageUrl(imageUrl)),
    [activeData]
  );
  const imagesCount = activeData?.images_count ?? images.length;
  const unsupportedObjectsDetected = Boolean(activeData?.unsupported_objects_detected);
  const notes = activeData?.notes ?? null;

  return (
    <AppLayout subtitle="Select a category to view all artwork.">
      <section className="space-y-8 sm:space-y-10 lg:space-y-12">
        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-muted/30 p-4 text-sm text-foreground">
            <span>{error}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRefreshTick((value) => value + 1)}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!isLoading && categories.length === 0 ? (
          <div className="rounded-3xl border border-border/50 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            No categories found.
          </div>
        ) : (
          <div className="space-y-5 sm:space-y-6 lg:space-y-8">
            <CategoryHeader
              key={activeCategory || "catalog-header"}
              categoryName={activeCategory || "Gallery"}
              imagesCount={imagesCount}
              unsupportedObjectsDetected={unsupportedObjectsDetected}
            />
            <CategoryTabs
              categories={categories.map((category) => category.name)}
              activeCategory={activeCategory}
              onChange={setActiveCategory}
            />
            <ImageGrid
              imageUrls={images}
              isLoading={isLoading}
              categoryName={activeCategory}
              imagesCount={imagesCount}
              unsupportedObjectsDetected={unsupportedObjectsDetected}
              notes={notes}
            />
          </div>
        )}
      </section>
    </AppLayout>
  );
}
