import React, { useState, useEffect } from 'react'

export default function AttributePanel({ feature, onChange }:{ feature:any; onChange:(f:any)=>void }){
  const [props, setProps] = useState<Record<string,any>>(feature?.properties||{})
  useEffect(()=> setProps(feature?.properties||{}), [feature])
  if(!feature) return null
  const updateKey = (k:string, v:any) => setProps(s=>({ ...s, [k]: v }))
  const addKey = () => setProps(s=>({ ...s, newKey: '' }))
  const save = ()=> onChange({ ...feature, properties: props })
  return (
  <div style={{position:'absolute', right:12, bottom:12, width:320, background:'white', padding:12, borderRadius:8, zIndex:999}}>
      <h4>Attributes</h4>
      {Object.keys(props).map(k=> (
        <div key={k} style={{display:'flex', gap:8, marginBottom:6}}>
          <input value={k} readOnly style={{width:120}} />
          <input value={props[k]} onChange={e=>updateKey(k, (e.target as any).value)} style={{flex:1}} />
        </div>
      ))}
      <div style={{display:'flex', gap:8}}>
        <button onClick={addKey}>+ Add</button>
        <button onClick={save}>Save</button>
      </div>
    </div>
  )
}
