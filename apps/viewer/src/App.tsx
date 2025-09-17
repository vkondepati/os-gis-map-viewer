import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { registerCRS } from './map/crs'
import EditToolbar from './components/EditToolbar'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') as string

export default function App() {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const drawRef = useRef<any>(null)
  const [, setReady] = useState(false)

  useEffect(() => {
    registerCRS()
    const map = new maplibregl.Map({
      container: 'map',
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 0],
      zoom: 2
    })
    mapRef.current = map

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      defaultMode: 'simple_select',
      modes: MapboxDraw.modes
    })
    // @ts-ignore
    map.addControl(draw)
    drawRef.current = draw

    map.on('load', () => {
      map.addSource('points', { type: 'geojson', data: '/samples/data/points.geojson' })
      map.addLayer({ id: 'points', type: 'circle', source: 'points', paint: { 'circle-radius': 5, 'circle-color': '#1d4ed8' } })
      map.addSource('lines', { type: 'geojson', data: '/samples/data/lines.geojson' })
      map.addLayer({ id: 'lines', type: 'line', source: 'lines', paint: { 'line-width': 2 } })
      map.addSource('polygons', { type: 'geojson', data: '/samples/data/polygons.geojson' })
      map.addLayer({ id: 'polygons', type: 'fill', source: 'polygons', paint: { 'fill-opacity': 0.3 } })
      setReady(true)
    })
    return () => map.remove()
  }, [])

  const setMode = (mode: string) => {
    if (drawRef.current) drawRef.current.changeMode(mode)
  }

  const save = async () => {
    if (!drawRef.current) return
    const collection = drawRef.current.getAll()
    try {
      const res = await fetch(`${API_BASE_URL}/edits/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collection)
      })
      const out = await res.json()
      alert(`Saved ${out.features} feature(s) to server`)
    } catch (e) {
      console.error(e)
      alert('Save failed. See console.')
    }
  }

  return (
    <div style={{height:'100vh', width:'100vw', position:'relative'}}>
      <EditToolbar onMode={setMode} onSave={save} />
      <div id="map" style={{height:'100%', width:'100%'}} />
    </div>
  )
}
