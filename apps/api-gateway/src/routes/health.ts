import { FastifyInstance } from 'fastify'
export async function health(f:FastifyInstance){f.get('/', async()=>({status:'ok'}))}
