export async function health(f) { f.get('/', async () => ({ status: 'ok' })); }
