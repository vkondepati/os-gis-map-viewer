import { fetch } from 'undici';

type DatasourceId =
  | 'sedona'
  | 'iceberg'
  | 'snowflake'
  | 'databricks'
  | 'aws-athena'
  | 'azure-adls';

type HttpMethod = 'GET' | 'POST';

type RequestOptions = {
  method: HttpMethod;
  path: string;
  body?: unknown;
};

const DEFAULT_TIMEOUT_MS = Number(process.env.HTTP_CLIENT_TIMEOUT_MS ?? 10_000);
const MAX_RETRIES = Number(process.env.HTTP_CLIENT_MAX_RETRIES ?? 3);
const BACKOFF_BASE_MS = Number(process.env.HTTP_CLIENT_BACKOFF_MS ?? 250);
const MAX_BACKOFF_MS = Number(process.env.HTTP_CLIENT_MAX_BACKOFF_MS ?? 4_000);

class HttpError extends Error {
  status: number;
  responseBody?: unknown;

  constructor(status: number, message: string, responseBody?: unknown) {
    super(message);
    this.status = status;
    this.responseBody = responseBody;
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetry = (error: unknown): boolean => {
  if (error instanceof HttpError) {
    if (error.status === 429) {
      return true;
    }
    return error.status >= 500;
  }

  return true;
};

const ensureBaseUrl = (envKey: string): string => {
  const value = process.env[envKey];
  if (!value) {
    throw new Error(`Missing environment variable ${envKey}`);
  }

  return value.replace(/\/?$/, '');
};

const sendRequest = async (baseUrl: string, options: RequestOptions) => {
  const url = `${baseUrl}${options.path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: options.method,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get('content-type');
    const payload = contentType?.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      throw new HttpError(response.status, `Request to ${url} failed with status ${response.status}`, payload);
    }

    return payload;
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${DEFAULT_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const withRetry = async <T>(operation: (attempt: number) => Promise<T>): Promise<T> => {
  let attempt = 0;
  let backoff = BACKOFF_BASE_MS;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await operation(attempt);
    } catch (error) {
      attempt += 1;
      if (attempt > MAX_RETRIES || !shouldRetry(error)) {
        throw error;
      }

      await delay(backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    }
  }
};

interface DatasourceHttpClient {
  listLayers(): Promise<unknown>;
  read(body: unknown): Promise<unknown>;
  write(body: unknown): Promise<unknown>;
}

const createDatasourceClient = (envKey: string): DatasourceHttpClient => {
  const getBaseUrl = () => ensureBaseUrl(envKey);

  return {
    listLayers: () =>
      withRetry((attempt) => {
        const baseUrl = getBaseUrl();
        const url = attempt === 0 ? '/layers' : `/layers?retry=${attempt}`;
        return sendRequest(baseUrl, { method: 'GET', path: url });
      }),
    read: (body) =>
      withRetry(() => {
        const baseUrl = getBaseUrl();
        return sendRequest(baseUrl, { method: 'POST', path: '/read', body });
      }),
    write: (body) =>
      withRetry(() => {
        const baseUrl = getBaseUrl();
        return sendRequest(baseUrl, { method: 'POST', path: '/write', body });
      }),
  };
};

const CLIENT_ENV_MAP: Record<DatasourceId, string> = {
  sedona: 'SEDONA_BASE_URL',
  iceberg: 'ICEBERG_BASE_URL',
  snowflake: 'SNOWFLAKE_BASE_URL',
  databricks: 'DATABRICKS_BASE_URL',
  'aws-athena': 'AWS_ATHENA_BASE_URL',
  'azure-adls': 'AZURE_ADLS_BASE_URL',
};

export const datasourceClients: Record<DatasourceId, DatasourceHttpClient> = Object.fromEntries(
  Object.entries(CLIENT_ENV_MAP).map(([id, envKey]) => [id, createDatasourceClient(envKey)])
) as Record<DatasourceId, DatasourceHttpClient>;

export type { DatasourceHttpClient };
