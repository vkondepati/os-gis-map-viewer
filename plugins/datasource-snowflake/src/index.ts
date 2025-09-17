import { Datasource } from '../../packages/sdk-backend/src/index.js'
export const snowflakeDatasource: Datasource = {
  id: 'snowflake',
  async listLayers() { return ['snowflake_example'] },
  async read(layer, q) { return [] }
}
