import { Datasource } from '../../packages/sdk-backend/src/index.js'
export const azure_adlsDatasource: Datasource = {
  id: 'azure-adls',
  async listLayers() { return ['azure-adls_example'] },
  async read(layer, q) { return [] }
}
