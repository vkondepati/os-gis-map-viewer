export type CRS = string;
export type BBox = [number, number, number, number];

export interface Feature {
  id: string | number;
  geometry: unknown;
  properties: Record<string, unknown>;
}

export interface Query {
  bbox?: BBox;
  crs?: CRS;
  filter?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  orderBy?: string[];
}

export interface Datasource {
  id: string;
  listLayers(): Promise<string[]>;
  read(layer: string, q?: Query): Promise<Feature[]>;
  write?(
    layer: string,
    features: Feature[],
    options?: { crs?: CRS }
  ): Promise<{ committed: number }>;
}

export const isBBox = (value: unknown): value is BBox =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate));

export const normalizeCRS = (crs?: string | null): CRS | undefined => {
  if (!crs) {
    return undefined;
  }

  const trimmed = crs.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^epsg:\d+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  if (/^\d+$/.test(trimmed)) {
    return `EPSG:${trimmed}`;
  }

  return trimmed;
};

interface GeoJSONFeature {
  type: 'Feature';
  id: string | number;
  geometry: unknown;
  properties: Record<string, unknown>;
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  crs?: {
    type: 'name';
    properties: {
      name: CRS;
    };
  };
}

export const geojsonFeatureCollection = (
  features: Feature[],
  crs?: CRS
): GeoJSONFeatureCollection => {
  const normalizedCrs = normalizeCRS(crs);
  const collection: GeoJSONFeatureCollection = {
    type: 'FeatureCollection',
    features: features.map((feature) => ({
      type: 'Feature',
      id: feature.id,
      geometry: feature.geometry,
      properties: (feature.properties ?? {}) as Record<string, unknown>,
    })),
  };

  if (normalizedCrs) {
    collection.crs = {
      type: 'name',
      properties: {
        name: normalizedCrs,
      },
    };
  }

  return collection;
};
