export interface Feature { id:string|number; geometry:any; properties:Record<string,any> }
export interface Query { bbox?:[number,number,number,number]; crs?:string; filter?:Record<string,any>; limit?:number }
export interface Datasource {
  id: string
  listLayers(): Promise<string[]>
  read(layer: string, q?: Query): Promise<Feature[]>
  write?(layer: string, features: Feature[], options?: { crs?: string }): Promise<{ committed: number }>
}
