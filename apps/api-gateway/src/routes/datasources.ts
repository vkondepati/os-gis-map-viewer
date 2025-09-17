import { FastifyInstance } from 'fastify'
export async function datasources(f:FastifyInstance){
  f.get('/', async ()=>({available:['sedona','iceberg','snowflake','databricks','aws-athena','azure-adls']}))
}
