import React from 'react'

const OPTIONS = ['EPSG:4326','EPSG:3857','EPSG:3857']

export default function CRSSelector({ value, onChange }:{ value?:string; onChange:(c:string)=>void }){
  return (
    <div style={{position:'absolute', top:12, right:12, background:'white', padding:8, borderRadius:8, zIndex:999}}>
      <label style={{fontSize:12}}>CRS</label>
      <select value={value||'EPSG:4326'} onChange={e=>onChange(e.target.value)}>
        {OPTIONS.map(o=> <option key={o} value={o}>{o}</option>)}
      </select>
      <div style={{fontSize:10, marginTop:6, color:'#666'}}>Note: base map uses WebMercator (EPSG:3857). CRS selection reprojects overlay data only.</div>
    </div>
  )
}
