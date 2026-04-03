import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const proxyTarget = process.env.NEXT_SERVER_API_PROXY_TARGET?.replace(/\/+$/, '');
const forwardedHeaders = ['accept', 'authorization', 'content-type'] as const;

function buildTargetUrl(path: string[], search: string): string {
  if (!proxyTarget) {
    throw new Error('NEXT_SERVER_API_PROXY_TARGET is not configured.');
  }

  const encodedPath = path.map(encodeURIComponent).join('/');
  return `${proxyTarget}/${encodedPath}${search}`;
}

function forwardHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  for (const header of forwardedHeaders) {
    const value = request.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  }

  return headers;
}

async function proxy(request: NextRequest, path: string[]) {
  if (!proxyTarget) {
    return Response.json(
      { detail: 'Remote API proxy target is not configured.' },
      { status: 500 },
    );
  }

  const method = request.method.toUpperCase();
  const targetUrl = buildTargetUrl(path, request.nextUrl.search);
  const headers = forwardHeaders(request);
  const init: RequestInit = {
    method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.text();
  }

  const upstream = await fetch(targetUrl, init);
  const responseHeaders = new Headers();

  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'content-length') return;
    responseHeaders.set(key, value);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(request, path);
}
