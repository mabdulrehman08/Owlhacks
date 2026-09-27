// In Docker this is the backend service on the compose network; running locally
// it is the uvicorn dev server. Either way only the server resolves it, so the
// browser talks to this origin alone — no CORS, no build-time API URL.
const BACKEND_URL = process.env["API_URL"] ?? "http://127.0.0.1:8000";

const PREFIX = "/api";

// Hop-by-hop headers, plus the ones that describe a body the proxy re-encodes:
// fetch decompresses upstream, so forwarding content-encoding would lie.
const STRIPPED_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function forwardableHeaders(source: Headers): Headers {
  const result = new Headers();
  source.forEach((value, key) => {
    if (!STRIPPED_HEADERS.has(key.toLowerCase())) result.append(key, value);
  });
  return result;
}

export function isApiRequest(url: URL): boolean {
  return url.pathname === PREFIX || url.pathname.startsWith(`${PREFIX}/`);
}

export async function proxyApiRequest(request: Request, url: URL): Promise<Response> {
  const target = new URL(url.pathname.slice(PREFIX.length) + url.search, BACKEND_URL);
  const sendsBody = request.method !== "GET" && request.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: forwardableHeaders(request.headers),
      body: sendsBody ? await request.arrayBuffer() : null,
      redirect: "manual",
    });
  } catch (error) {
    console.error(`API proxy could not reach ${target.href}`, error);
    return Response.json({ error: "Backend unreachable" }, { status: 502 });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: forwardableHeaders(upstream.headers),
  });
}
