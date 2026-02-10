import { useCallback, useEffect, useMemo, useState } from "react";

import CategoryHeader from "@/components/catalog/CategoryHeader";
import CategoryTabs from "@/components/catalog/CategoryTabs";
import ImageGrid from "@/components/catalog/ImageGrid";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, fetchCatalog, toAbsoluteImageUrl, type CatalogCategory } from "@/services/catalogApi";

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
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const [statusPanelOpen, setStatusPanelOpen] = useState(false);
  const showStatusPanel = import.meta.env.DEV || import.meta.env.VITE_SHOW_STATUS_PANEL === "1";

  const loadCatalog = useCallback(
    async (signal: AbortSignal, forceRefresh = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchedCategories = await fetchCatalog(signal, forceRefresh);
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
        setLastFetchedAt(new Date());
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load artwork catalog.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(controller.signal, refreshTick > 0);

    return () => controller.abort();
  }, [refreshTick, loadCatalog]);

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
  const totalImages = useMemo(
    () => categories.reduce((sum, category) => sum + (category.images_count ?? category.images.length), 0),
    [categories]
  );

  return (
    <AppLayout subtitle="Select a category to view all artwork.">
      <section className="space-y-6 sm:space-y-8 lg:space-y-10">
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
          <div className="space-y-6 sm:space-y-8 lg:space-y-10">
            <CategoryHeader
              key={activeCategory || "catalog-header"}
              categoryName={activeCategory || "Gallery"}
              imagesCount={imagesCount}
              unsupportedObjectsDetected={unsupportedObjectsDetected}
            />
            <CategoryTabs
              categories={categories.map((category) => ({
                name: category.name,
                imagesCount: category.images_count ?? category.images.length,
              }))}
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
      {showStatusPanel ? (
        <div className="fixed bottom-4 right-4 z-40 w-[min(90vw,340px)] rounded-2xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">Status</p>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => setRefreshTick((v) => v + 1)}>
                Refresh Catalog
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setStatusPanelOpen((open) => !open)}
              >
                {statusPanelOpen ? "Hide" : "Show"}
              </Button>
            </div>
          </div>
          {statusPanelOpen ? (
            <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between gap-2">
                <dt>API Base</dt>
                <dd className="truncate text-right">{API_BASE_URL}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Last Fetch</dt>
                <dd>{lastFetchedAt ? lastFetchedAt.toLocaleTimeString() : "N/A"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Categories</dt>
                <dd>{categories.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Total Images</dt>
                <dd>{totalImages}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Active Category</dt>
                <dd className="truncate text-right">{activeCategory || "-"}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : null}
    </AppLayout>
  );
}
