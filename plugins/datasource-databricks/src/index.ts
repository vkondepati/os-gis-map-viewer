import { Datasource } from '../../packages/sdk-backend/src/index.js'
export const databricksDatasource: Datasource = {
  id: 'databricks',
  async listLayers() { return ['databricks_example'] },
  async read(layer, q) { return [] }
}
