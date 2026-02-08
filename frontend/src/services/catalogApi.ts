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

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
const TRIMMED_API_BASE_URL = RAW_API_BASE_URL.trim().replace(/\/+$/, "");
const API_BASE_URL = TRIMMED_API_BASE_URL.endsWith("/api")
  ? TRIMMED_API_BASE_URL
  : `${TRIMMED_API_BASE_URL}/api`;

function joinUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function getApiOrigin(base: string): string {
  try {
    return new URL(base).origin;
  } catch {
    return base.replace(/\/api$/, "");
  }
}

const API_ORIGIN = getApiOrigin(API_BASE_URL);

export function toAbsoluteImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return joinUrl(API_ORIGIN, path);
}

export async function fetchCatalog(signal?: AbortSignal): Promise<CatalogCategory[]> {
  const response = await fetch(joinUrl(API_BASE_URL, "/catalog"), {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }

  const data = (await response.json()) as CatalogResponse;
  return data.categories ?? [];
}
