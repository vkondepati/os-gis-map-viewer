import { Datasource } from '../../packages/sdk-backend/src/index.js'
export const icebergDatasource: Datasource = {
  id: 'iceberg',
  async listLayers() { return ['iceberg_example'] },
  async read(layer, q) { return [] }
}
