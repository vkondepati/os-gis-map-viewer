import proj4 from 'proj4'
export function defineCRS(code:string, proj4def:string){ proj4.defs(code, proj4def) }
export function listCRS(){ return ['EPSG:4326','EPSG:3857','EPSG:32633'] }
