import proj4 from 'proj4'
export function registerCRS() {
  // EPSG:3857
  proj4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs')
  // Example UTM
  proj4.defs('EPSG:32633', '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs')
}
export function reproject([lon,lat]:[number,number], from='EPSG:4326', to='EPSG:3857'){
  return proj4(from, to, [lon,lat]) as [number,number]
}
