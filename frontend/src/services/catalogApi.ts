export type CatalogCategory = {
  name: string;
  images: string[];
  images_count?: number;
  unsupported_objects_detected?: boolean | number;
  notes?: string | null;
};

export type CatalogResponse = {
  categories: CatalogCategory[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export function toAbsoluteImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

export async function fetchCatalog(signal?: AbortSignal): Promise<CatalogCategory[]> {
  const response = await fetch(`${API_BASE_URL}/api/catalog`, {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }

  const data = (await response.json()) as CatalogResponse;
  return data.categories ?? [];
}
