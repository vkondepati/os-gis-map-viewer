import fs from 'node:fs/promises';
import path from 'node:path';
const DATA_DIR = process.env.DATA_DIR || '/data/samples';
export async function edits(f) {
    f.post('/save', async (req, reply) => {
        const body = (req.body ?? {});
        const file = path.join(DATA_DIR, 'edits.geojson');
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.writeFile(file, JSON.stringify(body, null, 2), 'utf-8');
        return { ok: true, path: file, features: Array.isArray(body.features) ? body.features.length : 0 };
    });
}
