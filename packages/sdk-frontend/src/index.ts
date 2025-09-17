export type MapTool = { id:string; title:string; activate:()=>void; deactivate:()=>void }
export type LayerPlugin = { id:string; addToMap:(map:any, options?:Record<string,unknown>)=>void }
export type DatasourceUI = { id:string; panel: any }
export type ViewerPlugin = MapTool | LayerPlugin | DatasourceUI
