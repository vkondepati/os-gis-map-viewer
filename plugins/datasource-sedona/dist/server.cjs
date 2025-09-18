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
    // Improved routing endpoint (snap-to-segment + intersections)
    if(req.method === 'POST' && req.url === '/route'){
      let body=''
      for await (const chunk of req) body += chunk
      const j = JSON.parse(body || '{}')
      const from = j.from // [lon, lat]
      const to = j.to
      const layer = j.layer || 'streets'
      if(!from || !to) return sendJSON(res, 400, { error: 'from and to required' })
      try{
        const file = path.join(DATA_ROOT, `${layer}.geojson`)
        const raw = await fs.readFile(file, 'utf-8')
        const parsed = JSON.parse(raw)
        const features = (parsed && parsed.features) || []

        // helpers
        function nearlyEqual(a,b,eps=1e-9){ return Math.abs(a-b) <= eps }
        function keyOf(c){ return `${c[0].toFixed(6)},${c[1].toFixed(6)}` }
        function parseKey(k){ const p=k.split(',').map(Number); return [p[0], p[1]] }
        function haversine(a,b){ const toRad = v => v*Math.PI/180; const R=6371000; const dLat=toRad(b[1]-a[1]); const dLon=toRad(b[0]-a[0]); const lat1=toRad(a[1]); const lat2=toRad(b[1]); const sinDLat=Math.sin(dLat/2); const sinDLon=Math.sin(dLon/2); const aa=sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLon*sinDLon; const c=Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa))*2; return R*c }

        // line segment projection and intersection helpers (in lon/lat with planar approx for projection)
        function dot(a,b){ return a[0]*b[0] + a[1]*b[1] }
        function sub(a,b){ return [a[0]-b[0], a[1]-b[1]] }
        function add(a,b){ return [a[0]+b[0], a[1]+b[1]] }
        function mul(a, s){ return [a[0]*s, a[1]*s] }

        function projectPointOnSegment(p, a, b){
          const ap = sub(p,a)
          const ab = sub(b,a)
          const ab2 = dot(ab,ab)
          if(ab2 === 0) return { t:0, point: a.slice() }
          const t = Math.max(0, Math.min(1, dot(ap,ab) / ab2))
          const proj = add(a, mul(ab, t))
          // approximate distance using haversine between p and proj
          return { t, point: proj, dist: haversine(p, proj) }
        }

        function segSegIntersection(a1,a2,b1,b2){
          // Using robust 2D segment intersection (in lon/lat planar approx)
          const x1=a1[0], y1=a1[1], x2=a2[0], y2=a2[1]
          const x3=b1[0], y3=b1[1], x4=b2[0], y4=b2[1]
          const denom = (y4-y3)*(x2-x1) - (x4-x3)*(y2-y1)
          if(Math.abs(denom) < 1e-12) return null
          const ua = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / denom
          const ub = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / denom
          if(ua >=0 && ua <=1 && ub >=0 && ub <=1){
            const xi = x1 + ua*(x2-x1)
            const yi = y1 + ua*(y2-y1)
            return [xi, yi]
          }
          return null
        }

        // collect segments
        const segments = []
        for(let fi=0; fi<features.length; fi++){
          const f = features[fi]
          if(!f.geometry || f.geometry.type !== 'LineString') continue
          const coords = f.geometry.coordinates
          for(let i=0;i<coords.length-1;i++){
            segments.push({ a: coords[i], b: coords[i+1], fi, si:i })
          }
        }
        if(segments.length === 0) return sendJSON(res, 400, { error: 'no routable data' })

        // split points per segment: start with endpoints
        const splitPoints = segments.map(s => [ { t:0, pt: s.a }, { t:1, pt: s.b } ])

        // find intersections between segments and add to splitPoints
        for(let i=0;i<segments.length;i++){
          for(let j=i+1;j<segments.length;j++){
            const I = segSegIntersection(segments[i].a, segments[i].b, segments[j].a, segments[j].b)
            if(I){
              // compute t for each
              const pi = projectPointOnSegment(I, segments[i].a, segments[i].b)
              const pj = projectPointOnSegment(I, segments[j].a, segments[j].b)
              splitPoints[i].push({ t: pi.t, pt: pi.point })
              splitPoints[j].push({ t: pj.t, pt: pj.point })
            }
          }
        }

        // project from/to onto nearest segment and add split points
        let bestFrom = { dist: Infinity, si: -1, res: null }
        let bestTo = { dist: Infinity, si: -1, res: null }
        for(let i=0;i<segments.length;i++){
          const pr = projectPointOnSegment(from, segments[i].a, segments[i].b)
          if(pr.dist < bestFrom.dist){ bestFrom = { dist: pr.dist, si:i, res: pr } }
          const pr2 = projectPointOnSegment(to, segments[i].a, segments[i].b)
          if(pr2.dist < bestTo.dist){ bestTo = { dist: pr2.dist, si:i, res: pr2 } }
        }
        if(bestFrom.si === -1 || bestTo.si === -1) return sendJSON(res, 400, { error: 'could not project points onto network' })
        // add projection points
        splitPoints[bestFrom.si].push({ t: bestFrom.res.t, pt: bestFrom.res.point })
        splitPoints[bestTo.si].push({ t: bestTo.res.t, pt: bestTo.res.point })

        // build graph nodes and edges by splitting segments at splitPoints
        const nodes = new Map()
        function ensureNode(pt){ const k = keyOf(pt); if(!nodes.has(k)) nodes.set(k, { coord: pt, neighbors: new Map() }); return k }
        for(let i=0;i<segments.length;i++){
          const s = segments[i]
          const splits = splitPoints[i]
          // unique & sort by t
          const uniq = []
          const seen = new Set()
          splits.sort((a,b)=> a.t - b.t)
          for(const sp of splits){ const k = keyOf(sp.pt); if(!seen.has(k)){ seen.add(k); uniq.push(sp.pt) } }
          for(let m=0;m<uniq.length-1;m++){
            const p1 = uniq[m], p2 = uniq[m+1]
            const k1 = ensureNode(p1), k2 = ensureNode(p2)
            const w = haversine(p1, p2)
            nodes.get(k1).neighbors.set(k2, w)
            nodes.get(k2).neighbors.set(k1, w)
          }
        }

        if(nodes.size === 0) return sendJSON(res, 400, { error: 'no graph nodes' })

        // determine start and goal keys by snapping to the projection points we added
        const startPt = bestFrom.res.point
        const goalPt = bestTo.res.point
        const startKey = keyOf(startPt)
        const goalKey = keyOf(goalPt)
        if(!nodes.has(startKey) || !nodes.has(goalKey)){
          // in rare rounding cases, find nearest node
          function nearestKey(pt){ let bk=null, bd=Infinity; for(const [k,v] of nodes.entries()){ const d = haversine(pt, v.coord); if(d<bd){ bd=d; bk=k } } return bk }
          const sk = nodes.has(startKey) ? startKey : nearestKey(startPt)
          const gk = nodes.has(goalKey) ? goalKey : nearestKey(goalPt)
          if(!sk || !gk) return sendJSON(res, 400, { error: 'could not snap to nodes' })
          // assign
          startKey = sk; goalKey = gk
        }

        // Dijkstra
        const dist = new Map(); const prev = new Map();
        for(const k of nodes.keys()) dist.set(k, Infinity)
        dist.set(startKey, 0)
        const q = new Set(nodes.keys())
        while(q.size){ let u=null, uDist=Infinity; for(const k of q){ const d=dist.get(k); if(d<uDist){ u=k; uDist=d } } if(u===null) break; q.delete(u); if(u===goalKey) break; const uNode = nodes.get(u); for(const [vKey, w] of uNode.neighbors.entries()){ const alt = dist.get(u) + w; if(alt < dist.get(vKey)){ dist.set(vKey, alt); prev.set(vKey, u) } } }

        if(!prev.has(goalKey) && startKey !== goalKey) return sendJSON(res, 400, { error: 'no path found' })
        // reconstruct path
        const pathKeys = []
        let cur = goalKey
        while(cur){ pathKeys.push(cur); if(cur === startKey) break; cur = prev.get(cur) }
        pathKeys.reverse()
        const routeCoords = pathKeys.map(k => parseKey(k))
        const routeFeature = { type: 'Feature', properties: { layer }, geometry: { type: 'LineString', coordinates: routeCoords } }
        return sendJSON(res, 200, routeFeature)
      }catch(err){ console.error(err); return sendJSON(res, 500, { error: 'route error', detail: String(err) }) }
    }
    return sendJSON(res, 404, { error: 'not found' })
  }catch(err){
    console.error(err)
    return sendJSON(res, 500, { error: 'server error' })
  }
})

const port = Number(process.env.PORT || 9100)
server.listen(port, '0.0.0.0', ()=> console.log(`sedona (cjs) listening ${port}`))
