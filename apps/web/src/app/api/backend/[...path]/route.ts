import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_DIRECT_API_BASE_URL ??
  'http://localhost:4000';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function copyRequestHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  return headers;
}

async function proxy(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const upstream = new URL(params.path.join('/'), `${API_BASE_URL}/`);
  upstream.search = request.nextUrl.search;

  const response = await fetch(upstream, {
    method: request.method,
    headers: copyRequestHeaders(request),
    body:
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer(),
    cache: 'no-store',
  });

  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
