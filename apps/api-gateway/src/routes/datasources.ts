import { FastifyInstance } from 'fastify'
import { clientFor, PLUGINS } from '../lib/clients.js'

export async function datasources(f:FastifyInstance){
  // discovery
  f.get('/', async ()=>({available:Object.keys(PLUGINS)}))

  // proxy: list layers
  f.get('/:id/layers', async (req, reply)=>{
    const id = (req.params as any).id
    const c = clientFor(id)
    try{
      return await c.call('/layers')
    }catch(err:any){
      reply.code(err.statusCode||502)
      return { error: err.message, detail: err.body||null }
    }
  })

  // proxy: read
  f.post('/:id/read', async (req, reply)=>{
    const id = (req.params as any).id
    const c = clientFor(id)
    try{
      return await c.call('/read', { method: 'POST', body: req.body })
    }catch(err:any){
      reply.code(err.statusCode||502)
      return { error: err.message, detail: err.body||null }
    }
  })

  // proxy: write
  f.post('/:id/write', async (req, reply)=>{
    const id = (req.params as any).id
    const c = clientFor(id)
    try{
      return await c.call('/write', { method: 'POST', body: req.body })
    }catch(err:any){
      reply.code(err.statusCode||502)
      return { error: err.message, detail: err.body||null }
    }
  })
}
