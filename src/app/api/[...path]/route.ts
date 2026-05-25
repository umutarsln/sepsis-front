import { NextRequest, NextResponse } from 'next/server';

import {
  fetchBackendWithRetry,
  resolveBackendBaseUrl,
} from '@/lib/backend-proxy';

export const runtime = 'nodejs';

/**
 * Catch-all path segmentlerini backend URL yoluna birlestirir.
 */
function buildBackendPath(segments: string[]): string {
  return segments.map(encodeURIComponent).join('/');
}

/**
 * Istemciden backend'e iletilecek header'lari filtreler.
 */
function pickForwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');
  if (contentType) headers.set('content-type', contentType);
  if (accept) headers.set('accept', accept);
  return headers;
}

/**
 * Gelen Next.js istegini FastAPI backend'ine proxy eder.
 */
async function proxyToBackend(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  const path = buildBackendPath(context.params.path ?? []);
  const search = request.nextUrl.search;
  const targetUrl = `${resolveBackendBaseUrl()}/${path}${search}`;
  const method = request.method.toUpperCase();

  let body: BodyInit | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  try {
    const backendResponse = await fetchBackendWithRetry(
      targetUrl,
      {
        method,
        headers: pickForwardHeaders(request),
        body,
        cache: 'no-store',
      },
      path,
    );

    const responseBody = await backendResponse.arrayBuffer();
    const headers = new Headers();
    const contentType = backendResponse.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);

    return new NextResponse(responseBody, {
      status: backendResponse.status,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Backend baglantisi kurulamadi';
    const isTimeout =
      message.toLowerCase().includes('timeout') ||
      (error as NodeJS.ErrnoException).code === 'ETIMEDOUT';

    return NextResponse.json(
      {
        detail: isTimeout
          ? 'Backend yanit vermedi (timeout). Sunucu meşgul olabilir; birkaç saniye sonra tekrar deneyin.'
          : `Backend baglantisi kesildi: ${message}`,
      },
      { status: isTimeout ? 504 : 502 },
    );
  }
}

/** GET isteklerini backend'e yonlendirir. */
export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  return proxyToBackend(request, context);
}

/** POST isteklerini backend'e yonlendirir. */
export async function POST(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  return proxyToBackend(request, context);
}

/** PUT isteklerini backend'e yonlendirir. */
export async function PUT(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  return proxyToBackend(request, context);
}

/** PATCH isteklerini backend'e yonlendirir. */
export async function PATCH(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  return proxyToBackend(request, context);
}

/** DELETE isteklerini backend'e yonlendirir. */
export async function DELETE(
  request: NextRequest,
  context: { params: { path: string[] } },
): Promise<NextResponse> {
  return proxyToBackend(request, context);
}
