import { Datasource } from '../../packages/sdk-backend/src/index.js'
export const sedonaDatasource: Datasource = {
  id: 'sedona',
  async listLayers() { return ['sedona_example'] },
  async read(layer, q) { return [] }
}
