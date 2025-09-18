import { request } from 'undici';
export function getClient(opts) {
    const base = opts.baseUrl.replace(/\/$/, '');
    const timeoutMs = opts.timeoutMs ?? 10_000;
    const retries = opts.retries ?? 3;
    async function call(path, init = {}) {
        const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
        let attempt = 0;
        let lastErr;
        while (attempt <= retries) {
            try {
                const headers = { 'content-type': 'application/json', ...(init.headers || {}) };
                const body = init.body ? JSON.stringify(init.body) : undefined;
                const res = await request(url, { method: init.method || 'GET', body, headers, bodyTimeout: timeoutMs, headersTimeout: timeoutMs });
                const text = await res.body.text();
                const ct = res.headers['content-type'] || '';
                const data = ct.includes('application/json') ? JSON.parse(text || '{}') : text;
                if (res.statusCode >= 400)
                    throw Object.assign(new Error(`HTTP ${res.statusCode}`), { statusCode: res.statusCode, body: data });
                return data;
            }
            catch (err) {
                lastErr = err;
                attempt++;
                const backoff = Math.min(2000, 100 * Math.pow(2, attempt));
                await new Promise(r => setTimeout(r, backoff));
            }
        }
        throw lastErr;
    }
    return { call };
}
export const PLUGINS = {
    sedona: process.env.SEDONA_URL || 'http://localhost:9100',
    iceberg: process.env.ICEBERG_URL || 'http://localhost:9200',
    snowflake: process.env.SNOWFLAKE_URL || 'http://localhost:9300',
    databricks: process.env.DATABRICKS_URL || 'http://localhost:9400',
    'aws-athena': process.env.ATHENA_URL || 'http://localhost:9500',
    'azure-adls': process.env.AZURE_ADLS_URL || 'http://localhost:9600',
};
export function clientFor(pluginId) {
    const base = PLUGINS[pluginId];
    if (!base)
        throw new Error(`unknown plugin ${pluginId}`);
    return getClient({ baseUrl: base });
}
