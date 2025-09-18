export type CRS = string
export type BBox = [number, number, number, number]

export interface Feature { id: string | number; geometry: any; properties: Record<string, any> }
export interface Query {
  bbox?: BBox
  crs?: CRS
  filter?: Record<string, any>
  limit?: number
  offset?: number
  orderBy?: string[]
}

export interface Datasource {
  id: string
  listLayers(): Promise<string[]>
  read(layer: string, q?: Query): Promise<Feature[]>
  write?(layer: string, features: Feature[], options?: { crs?: CRS }): Promise<{ committed: number }>
}

// Helpers
export function isBBox(v: any): v is BBox {
  return Array.isArray(v) && v.length === 4 && v.every(n => typeof n === 'number')
}

export function normalizeCRS(c?: string): CRS {
  if (!c) return 'EPSG:4326'
  return c.toUpperCase().startsWith('EPSG:') ? c.toUpperCase() : `EPSG:${c}`
}

export function geojsonFeatureCollection(features: Feature[], crs?: CRS) {
  const fc: any = { type: 'FeatureCollection', features: features.map(f => ({ type: 'Feature', id: f.id, geometry: f.geometry, properties: f.properties })) }
  if (crs) fc.crs = { type: 'name', properties: { name: normalizeCRS(crs) } }
  return fc
}
