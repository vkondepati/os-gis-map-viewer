const http = require('http')
const { request } = require('http')
const url = require('url')
const fs = require('fs').promises

const SEDONA_URL = process.env.SEDONA_URL || 'http://localhost:9100'

function proxyToSedona(path, method='GET', body){
  return new Promise((resolve,reject)=>{
    const u = new URL(path, SEDONA_URL)
    const opts = { method, hostname: u.hostname, port: u.port, path: u.pathname + (u.search||''), headers: { 'content-type':'application/json' } }
    const req = request(opts, (res)=>{
      let data=''
      res.on('data', c=> data+=c)
      res.on('end', ()=>{
        try{ resolve(JSON.parse(data||'{}')) }catch(e){ resolve(data) }
      })
    })
    req.on('error', reject)
    if(body) req.write(JSON.stringify(body))
    req.end()
  })
}

const server = http.createServer(async (req, res) => {
  try{
    const parsed = url.parse(req.url, true)
    if(req.method === 'GET' && parsed.pathname === '/datasources'){
      return res.end(JSON.stringify({ available: ['sedona'] }))
    }
    if(parsed.pathname && parsed.pathname.startsWith('/datasources/')){
      const parts = parsed.pathname.split('/').filter(Boolean)
      const id = parts[1]
      const action = parts[2]
      if(action === 'layers' && req.method === 'GET'){
        const data = await proxyToSedona('/layers')
        return res.end(JSON.stringify(data))
      }
      if(action === 'read' && req.method === 'POST'){
        let body=''
        for await (const chunk of req) body += chunk
        const j = JSON.parse(body||'{}')
        const data = await proxyToSedona('/read', 'POST', j)
        return res.end(JSON.stringify(data))
      }
      if(action === 'write' && req.method === 'POST'){
        let body=''
        for await (const chunk of req) body += chunk
        const j = JSON.parse(body||'{}')
        const data = await proxyToSedona('/write','POST', j)
        return res.end(JSON.stringify(data))
      }
    }

    if(req.method === 'POST' && parsed.pathname === '/edits/save'){
      let body=''
      for await (const chunk of req) body += chunk
      const j = JSON.parse(body||'{}')
      // write to samples/edits.geojson
      const file = 'samples/data/edits.geojson'
      await fs.mkdir('samples/data', { recursive: true })
      await fs.writeFile(file, JSON.stringify(j, null, 2), 'utf-8')
      return res.end(JSON.stringify({ ok:true, features: Array.isArray(j.features)? j.features.length : 0 }))
    }

    // Note: CRS transform passthrough not implemented in this minimal server.

    res.writeHead(404)
    res.end(JSON.stringify({ error: 'not found' }))
  }catch(err){ console.error(err); res.writeHead(500); res.end(JSON.stringify({ error: 'server error' })) }
})

const port = Number(process.env.PORT || 8080)
server.listen(port, '0.0.0.0', ()=> console.log(`api-gateway (cjs) listening ${port}`))
