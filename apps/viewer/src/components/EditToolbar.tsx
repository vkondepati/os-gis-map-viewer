import React from 'react'

export default function EditToolbar({ onMode, onSave }:{ onMode:(m:string)=>void; onSave:()=>void }){
  return (
  <div style={{position:'absolute', top:12, left:12, background:'white', padding:8, borderRadius:8, boxShadow:'0 2px 8px rgba(0,0,0,0.2)', display:'flex', gap:8, zIndex:1000}}>
      <button onClick={()=>onMode('simple_select')}>Select</button>
      <button onClick={()=>onMode('draw_point')}>Point</button>
      <button onClick={()=>onMode('draw_line_string')}>Line</button>
      <button onClick={()=>onMode('draw_polygon')}>Polygon</button>
      <button onClick={onSave} title="Save to API">Save</button>
    </div>
  )
}
