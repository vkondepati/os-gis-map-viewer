import { Datasource } from '../../packages/sdk-backend/src/index.js'
export const aws_athenaDatasource: Datasource = {
  id: 'aws-athena',
  async listLayers() { return ['aws-athena_example'] },
  async read(layer, q) { return [] }
}
