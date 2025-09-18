const http = require('http')
const fs = require('fs').promises
const path = require('path')

// Ensure DATA_ROOT resolves to the repository samples/data directory by default
const DATA_ROOT = process.env.SAMPLES_SEDONA_PATH || path.resolve(__dirname, '../../..', 'samples', 'data')
const AUDIT_DIR = process.env.SEDONA_AUDIT_DIR || path.resolve(__dirname, '../data/audit')

async function listSampleLayers(){
  try{
    const files = await fs.readdir(DATA_ROOT)
    return files.filter(f => f.endsWith('.geojson')).map(f => f.replace(/\.geojson$/, ''))
  }catch(err){
    return []
  }
}

function sendJSON(res, code, obj){ res.writeHead(code, {'Content-Type':'application/json'}); res.end(JSON.stringify(obj)) }

const server = http.createServer(async (req, res) => {
  try{
    if(req.method === 'GET' && req.url === '/layers'){
      const layers = await listSampleLayers()
      return sendJSON(res, 200, { layers })
    }
    if(req.method === 'POST' && req.url === '/read'){
      let body=''
      for await (const chunk of req) body += chunk
      const j = JSON.parse(body || '{}')
      const layer = j.layer || j.name
      if(!layer) return sendJSON(res, 400, { error: 'layer required' })
      const file = path.join(DATA_ROOT, `${layer}.geojson`)
      try{
        const raw = await fs.readFile(file, 'utf-8')
        const parsed = JSON.parse(raw)
        return sendJSON(res, 200, parsed)
      }catch(err){
        return sendJSON(res, 404, { error: 'layer not found' })
      }
    }
    if(req.method === 'POST' && req.url === '/write'){
      let body=''
      for await (const chunk of req) body += chunk
      const j = JSON.parse(body || '{}')
      const layer = j.layer
      const features = j.features || []
      if(!layer) return sendJSON(res, 400, { error: 'layer required' })
      const file = path.join(DATA_ROOT, `${layer}.geojson`)
      await fs.mkdir(path.dirname(file), { recursive: true })
      let existing = { type: 'FeatureCollection', features: [] }
      try{
        const raw = await fs.readFile(file, 'utf-8')
        existing = JSON.parse(raw)
      }catch(_){ }
      existing.features = existing.features.concat(features)
      await fs.writeFile(file, JSON.stringify(existing, null, 2), 'utf-8')
      await fs.mkdir(AUDIT_DIR, { recursive: true })
      const stamp = new Date().toISOString().replace(/[:.]/g,'-')
      const auditFile = path.join(AUDIT_DIR, `${layer}-${stamp}.json`)
      await fs.writeFile(auditFile, JSON.stringify({ layer, added: features.length, when: new Date().toISOString() }, null, 2), 'utf-8')
      return sendJSON(res, 200, { committed: features.length })
    }
    return sendJSON(res, 404, { error: 'not found' })
  }catch(err){
    console.error(err)
    return sendJSON(res, 500, { error: 'server error' })
  }
})

const port = Number(process.env.PORT || 9100)
server.listen(port, '0.0.0.0', ()=> console.log(`sedona (cjs) listening ${port}`))
