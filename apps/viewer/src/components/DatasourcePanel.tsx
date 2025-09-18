import React, { useEffect, useState } from 'react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') as string

export default function DatasourcePanel({ onSelect }:{ onSelect:(ds:{id:string,layer?:string})=>void }){
  const [datasources, setDatasources] = useState<string[]>([])
  const [selectedDs, setSelectedDs] = useState<string | undefined>()
  const [layers, setLayers] = useState<string[]>([])
  const [selectedLayer, setSelectedLayer] = useState<string | undefined>()

  useEffect(()=>{
    fetch(`${API_BASE_URL}/datasources`).then(r=>r.json()).then(j=>setDatasources(j.available||j))
  }, [])

  useEffect(()=>{
    if(!selectedDs) return setLayers([])
    fetch(`${API_BASE_URL}/datasources/${selectedDs}/layers`).then(r=>r.json()).then(j=> setLayers(j.layers||[]))
  }, [selectedDs])

  useEffect(()=>{ if(selectedDs && selectedLayer) onSelect({ id:selectedDs, layer: selectedLayer }) }, [selectedDs, selectedLayer])

  return (
    <div style={{position:'absolute', top:60, left:12, background:'white', padding:8, borderRadius:8}}>
      <div>
        <label>Datasource</label>
        <select value={selectedDs} onChange={e=>setSelectedDs((e.target as any).value)}>
          <option value={''}>-- choose --</option>
          {datasources.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label>Layer</label>
        <select value={selectedLayer} onChange={e=>setSelectedLayer((e.target as any).value)}>
          <option value={''}>-- choose --</option>
          {layers.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>
    </div>
  )
}
