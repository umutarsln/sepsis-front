/**
 * Next.js → FastAPI backend proxy yardimcilari.
 * Rewrite yerine route handler ile uzun timeout ve retry kullanilir.
 */

const DEFAULT_BACKEND = 'http://localhost:8000';

/** Agir tahmin endpoint'leri icin maksimum bekleme (ms). */
const SLOW_ENDPOINT_TIMEOUT_MS = 120_000;

/** Diger endpoint'ler icin varsayilan bekleme (ms). */
const DEFAULT_TIMEOUT_MS = 45_000;

/** Agir isteklerde yeniden deneme sayisi. */
const SLOW_MAX_RETRIES = 2;

/** Hafif isteklerde yeniden deneme sayisi. */
const DEFAULT_MAX_RETRIES = 3;

/**
 * BACKEND_API_URL ortam degiskenini normalize eder.
 * Protokol yoksa localhost icin http://, diger hostlar icin https:// ekler.
 */
export function resolveBackendBaseUrl(): string {
  const raw = (process.env.BACKEND_API_URL ?? DEFAULT_BACKEND).trim();
  if (!raw) return DEFAULT_BACKEND;

  let base = raw.endsWith('/') ? raw.slice(0, -1) : raw;
  if (/^https?:\/\//i.test(base)) {
    return base;
  }

  const isLocal =
    base.startsWith('localhost') ||
    base.startsWith('127.0.0.1') ||
    base.startsWith('[::1]');
  base = `${isLocal ? 'http' : 'https'}://${base}`;
  return base;
}

/**
 * Backend yoluna gore proxy timeout suresini belirler.
 */
export function resolveProxyTimeoutMs(path: string): number {
  const slow =
    path.includes('predict/snapshot/explain') ||
    path.includes('predict/window') ||
    path.includes('predict/snapshot');
  return slow ? SLOW_ENDPOINT_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

/**
 * Backend yoluna gore maksimum retry sayisini belirler.
 */
export function resolveMaxRetries(path: string): number {
  const slow =
    path.includes('predict/snapshot/explain') ||
    path.includes('predict/window');
  return slow ? SLOW_MAX_RETRIES : DEFAULT_MAX_RETRIES;
}

/**
 * Gecici ag / backend kopmasi olup olmadigini kontrol eder.
 */
function isRetryableProxyError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  const code = (error as NodeJS.ErrnoException).code?.toLowerCase() ?? '';
  return (
    code === 'econnreset' ||
    code === 'econnrefused' ||
    code === 'etimedout' ||
    code === 'und_err_connect_timeout' ||
    msg.includes('fetch failed') ||
    msg.includes('socket hang up') ||
    msg.includes('network')
  );
}

/**
 * Verilen sure sonunda AbortSignal ureten yardimci.
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

/**
 * Istekler arasi bekleme uygular.
 */
async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Backend'e timeout ve retry ile HTTP istegi gonderir.
 */
export async function fetchBackendWithRetry(
  targetUrl: string,
  init: RequestInit,
  path: string,
): Promise<Response> {
  const timeoutMs = resolveProxyTimeoutMs(path);
  const maxRetries = resolveMaxRetries(path);
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(targetUrl, {
        ...init,
        signal: createTimeoutSignal(timeoutMs),
      });
      if (response.status >= 502 && response.status <= 504 && attempt < maxRetries) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (!isRetryableProxyError(error) || attempt >= maxRetries) {
        throw error;
      }
      await sleep(500 * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Backend proxy basarisiz');
}
