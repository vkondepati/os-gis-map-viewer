import Fastify from 'fastify'
import fs from 'node:fs/promises'
import path from 'node:path'
import { geojsonFeatureCollection } from '../../packages/sdk-backend/src/index.js'

const app = Fastify({ logger: true })

const DATA_ROOT = process.env.SAMPLES_SEDONA_PATH || path.resolve(process.cwd(), '../../../samples/data')
const AUDIT_DIR = process.env.SEDONA_AUDIT_DIR || path.resolve(process.cwd(), './data/audit')

async function listSampleLayers(){
  try{
    const files = await fs.readdir(DATA_ROOT)
    return files.filter(f => f.endsWith('.geojson')).map(f => f.replace(/\.geojson$/, ''))
  }catch(err){
    return []
  }
}

app.get('/layers', async ()=>{
  const layers = await listSampleLayers()
  return { layers }
})

app.post('/read', async (req, reply)=>{
  const body = (req.body ?? {}) as any
  const layer = body.layer || body.name
  if(!layer) return reply.code(400).send({ error: 'layer required' })
  const file = path.join(DATA_ROOT, `${layer}.geojson`)
  try{
    const raw = await fs.readFile(file, 'utf-8')
    const parsed = JSON.parse(raw)
    // if FeatureCollection, return features; else wrap
    if(parsed && parsed.type === 'FeatureCollection') return parsed
    if(Array.isArray(parsed)) return geojsonFeatureCollection(parsed)
    return geojsonFeatureCollection([])
  }catch(err:any){
    return reply.code(404).send({ error: 'layer not found', detail: String(err) })
  }
})

app.post('/write', async (req, reply)=>{
  const body = (req.body ?? {}) as any
  const layer = body.layer
  const features = body.features || (body.geojson && body.geojson.features) || []
  if(!layer) return reply.code(400).send({ error: 'layer required' })
  const file = path.join(DATA_ROOT, `${layer}.geojson`)
  await fs.mkdir(path.dirname(file), { recursive: true })
  // read existing
  let existing: any = { type: 'FeatureCollection', features: [] }
  try{
    const raw = await fs.readFile(file, 'utf-8')
    existing = JSON.parse(raw)
  }catch(_){ /* no existing */ }
  existing.features = existing.features.concat(features)
  await fs.writeFile(file, JSON.stringify(existing, null, 2), 'utf-8')
  // write audit
  await fs.mkdir(AUDIT_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g,'-')
  const auditFile = path.join(AUDIT_DIR, `${layer}-${stamp}.json`)
  await fs.writeFile(auditFile, JSON.stringify({ layer, added: features.length, when: new Date().toISOString() }, null, 2), 'utf-8')
  return { committed: features.length }
})

const port = Number(process.env.PORT || 9100)
app.listen({ port, host: '0.0.0.0' }).then(()=>app.log.info(`sedona plugin listening ${port}`))
