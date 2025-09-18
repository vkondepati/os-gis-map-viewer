import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { registerCRS } from './map/crs'
import EditToolbar from './components/EditToolbar'
import CRSSelector from './components/CRSSelector'
import DatasourcePanel from './components/DatasourcePanel'
import AttributePanel from './components/AttributePanel'
import { reproject } from './map/crs'

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
      // hook draw events so drawn features are visible and can be inspected
      try{
        const d = drawRef.current
        if(d){
          map.on('draw.create', ()=>{ const c = d.getAll(); console.log('draw.create', c); const src = map.getSource('draw-debug') as any; if(!src){ map.addSource('draw-debug', { type:'geojson', data: c }); map.addLayer({ id:'draw-debug-layer', type:'line', source:'draw-debug', paint:{'line-color':'#10b981','line-width':3} }) } else src.setData(c) })
          map.on('draw.update', ()=>{ const c = d.getAll(); console.log('draw.update', c); const src = map.getSource('draw-debug') as any; if(src) src.setData(c) })
          map.on('draw.delete', ()=>{ const c = d.getAll(); console.log('draw.delete', c); const src = map.getSource('draw-debug') as any; if(src) src.setData(c) })
        }
      }catch(err){ console.warn('draw hooks failed', err) }
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
      const txt = await res.text()
      let out: any = {}
      try{ out = JSON.parse(txt) }catch(_){ out = { raw: txt } }
      if(!res.ok) return alert('Save failed: ' + (out.error || out.raw || JSON.stringify(out)))
      alert(`Saved ${out.features ?? (out.features?.length) ?? 'unknown'} feature(s) to server`)
    } catch (e) {
      console.error(e)
      alert('Save failed. See console.')
    }
  }

  // datasource handling
  const [currentDatasource, setCurrentDatasource] = useState<{id:string, layer?:string}|null>(null)
  const [selectedFeature, setSelectedFeature] = useState<any>(null)
  const [routingMode, setRoutingMode] = useState(false)
  const [routeFeature, setRouteFeature] = useState<any>(null)
  const [crs, setCrs] = useState('EPSG:4326')

  function reprojectGeojson(geo:any, to:string){
    if(!geo) return geo
    const out = JSON.parse(JSON.stringify(geo))
    if(out.type === 'FeatureCollection' && Array.isArray(out.features)){
      out.features = out.features.map((f:any)=>{
        if(!f.geometry) return f
        const g = f.geometry
        if(g.type === 'Point') g.coordinates = reproject(g.coordinates, 'EPSG:4326', to)
        if(g.type === 'LineString') g.coordinates = g.coordinates.map((c:any)=> reproject(c, 'EPSG:4326', to))
        return f
      })
    }
    return out
  }

  useEffect(()=>{
    if(!currentDatasource || !mapRef.current) return
    const { id, layer } = currentDatasource
    fetch(`${API_BASE_URL}/datasources/${id}/read`, { method: 'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ layer }) })
      .then(r=>r.json()).then(j=>{
        // If CRS is not 4326, attempt to reproject features client-side (basic)
        const data = (crs === 'EPSG:4326') ? j : reprojectGeojson(j, crs)
        const src = mapRef.current!.getSource('dynamic') as any
        if(!src) mapRef.current!.addSource('dynamic', { type:'geojson', data })
        else src.setData(data)
        if(!mapRef.current!.getLayer('dynamic-layer')){
          mapRef.current!.addLayer({ id:'dynamic-layer', type:'circle', source:'dynamic', paint:{'circle-radius':6,'circle-color':'#e11d48'} })
          mapRef.current!.on('click', 'dynamic-layer', (ev:any)=>{
            setSelectedFeature(ev.features && ev.features[0])
          })
          // allow clicking dynamic features to start routing from that feature
          mapRef.current!.on('dblclick', 'dynamic-layer', (ev:any)=>{
            const feat = ev.features && ev.features[0]
            if(feat){ setSelectedFeature(feat); setRoutingMode(true); alert('Routing mode: click map to choose destination') }
          })
        }
      })
  }, [currentDatasource])

  const onDatasourceSelect = (d:{id:string, layer?:string}) => setCurrentDatasource(d)

  // wire CRS selector change
  const onCrsChange = (c:string) => {
    setCrs(c)
    // refresh current datasource to reproject features
    if(currentDatasource) setCurrentDatasource({ ...currentDatasource })
  }

  const onFeatureSave = async (feat:any) => {
    if(!currentDatasource) return alert('No datasource selected')
    try{
      const res = await fetch(`${API_BASE_URL}/datasources/${currentDatasource.id}/write`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ layer: currentDatasource.layer, features: [feat] }) })
      const out = await res.json()
      alert(`Saved ${out.committed} features`) 
    }catch(e){ console.error(e); alert('Write failed') }
  }

  // map click handler for routing
  useEffect(()=>{
    const map = mapRef.current
    if(!map) return () => {}
    function onMapClick(ev:any){
      if(!routingMode) return
      // ev.lngLat contains lng/lat
      const dest:[number,number] = [ev.lngLat.lng, ev.lngLat.lat]
      if(!selectedFeature || !currentDatasource) return alert('Select a vehicle first (double-click)')
      const from = selectedFeature.geometry && selectedFeature.geometry.coordinates
      if(!from) return alert('Selected feature has no geometry')
      // call route endpoint
      fetch(`${API_BASE_URL}/datasources/${currentDatasource.id}/route`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ layer: currentDatasource.layer || 'streets', from, to: dest })
      }).then(r=>r.json()).then(j=>{
        if(j && j.error){ alert('Route error: '+j.error); setRoutingMode(false); return }
          setRouteFeature(j)
          // add or update source/layer
          const m = map!
          const src = m.getSource && m.getSource('route') as any
          if(!src){
            m.addSource('route', { type:'geojson', data: j })
            m.addLayer({ id:'route-layer', type:'line', source:'route', paint:{'line-color':'#0ea5e9','line-width':4} })
          } else {
            src.setData(j)
          }
        setRoutingMode(false)
      }).catch(err=>{ console.error(err); alert('Route failed'); setRoutingMode(false) })
    }
    map.on('click', onMapClick)
    return ()=> { if(map) map.off('click', onMapClick) }
  }, [routingMode, selectedFeature, currentDatasource])

  return (
    <div style={{height:'100vh', width:'100vw', position:'relative'}}>
      <EditToolbar onMode={setMode} onSave={save} />
  <DatasourcePanel onSelect={onDatasourceSelect} />
  <CRSSelector value={crs} onChange={onCrsChange} />
      <AttributePanel feature={selectedFeature} onChange={onFeatureSave} />
      <div id="map" style={{height:'100%', width:'100%'}} />
    </div>
  )
}
