import { fetch } from 'undici';
const CRS_BASE_URL = process.env.CRS_BASE_URL || 'http://localhost:9000';
export async function crs(f) {
    f.get('/transform', async (req, reply) => {
        const { coords, from = 'EPSG:4326', to = 'EPSG:3857' } = req.query || {};
        if (!coords)
            return reply.code(400).send({ error: 'coords required' });
        const res = await fetch(`${CRS_BASE_URL}/transform?coords=${coords}&from=${from}&to=${to}`);
        return res.json();
    });
}
