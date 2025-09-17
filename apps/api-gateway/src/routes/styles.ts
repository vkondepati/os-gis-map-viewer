import { FastifyInstance } from 'fastify'
export async function styles(f:FastifyInstance){f.get('/', async()=>({message:'styles API placeholder'}))}
