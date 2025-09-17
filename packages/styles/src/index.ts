export type ColorRamp = string[]
export type Symbol = { type: 'point'|'line'|'polygon'; paint: Record<string, any> }
export const ramps: Record<string, ColorRamp> = { classic: ['#1d4ed8','#3b82f6','#93c5fd'] }
export const symbols: Record<string, Symbol> = {
  pointDefault: { type: 'point', paint: { 'circle-radius': 5, 'circle-color': '#1d4ed8' } },
  lineDefault: { type: 'line', paint: { 'line-width': 2 } },
  polygonDefault: { type: 'polygon', paint: { 'fill-opacity': 0.3 } }
}
