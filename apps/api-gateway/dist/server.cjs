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
    // Simple CORS handling for the demo viewer
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if(req.method === 'OPTIONS'){
      res.writeHead(204)
      return res.end()
    }
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
      if(action === 'route' && req.method === 'POST'){
        let body=''
        for await (const chunk of req) body += chunk
        const j = JSON.parse(body||'{}')
        const data = await proxyToSedona('/route', 'POST', j)
        return res.end(JSON.stringify(data))
      }
    }

    if(req.method === 'POST' && parsed.pathname === '/edits/save'){
      let body=''
      for await (const chunk of req) body += chunk
  console.log('/edits/save received, bytes=', body.length)
  try{ console.log('body preview:', JSON.stringify(body.slice(0,200))) }catch(_){ }
  let j = {}
  try{ j = JSON.parse(body||'{}') }catch(e){ console.error('invalid json on edits/save', e); console.error('raw body chars:', Array.from((body||'').slice(0,80)).map(c=>c.charCodeAt? c.charCodeAt(0): c)); return res.writeHead(400) && res.end(JSON.stringify({ error: 'invalid json' })) }
      // write to samples/edits.geojson
      const file = 'samples/data/edits.geojson'
      await fs.mkdir('samples/data', { recursive: true })
      await fs.writeFile(file, JSON.stringify(j, null, 2), 'utf-8')
      console.log('wrote edits to', file)
      return res.end(JSON.stringify({ ok:true, features: Array.isArray(j.features)? j.features.length : 0 }))
    }

    // Note: CRS transform passthrough not implemented in this minimal server.

    res.writeHead(404)
    res.end(JSON.stringify({ error: 'not found' }))
  }catch(err){ console.error(err); res.writeHead(500); res.end(JSON.stringify({ error: 'server error' })) }
})

const port = Number(process.env.PORT || 8080)
server.listen(port, '0.0.0.0', ()=> console.log(`api-gateway (cjs) listening ${port}`))
