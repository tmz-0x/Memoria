export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Reverse-proxy API routes and uploads to the backend API server
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) {
      const backendUrl = new URL(url.pathname + url.search, 'https://api.memoria-26.live');

      const headers = new Headers(request.headers);
      headers.set('Host', 'api.memoria-26.live');

      const isBodyAllowed = !['GET', 'HEAD'].includes(request.method.toUpperCase());

      const proxyRequest = new Request(backendUrl.toString(), {
        method: request.method,
        headers,
        body: isBodyAllowed ? request.body : undefined,
        redirect: 'follow',
      });

      return fetch(proxyRequest);
    }

    // 2. Serve static assets via Cloudflare Assets
    const response = await env.ASSETS.fetch(request);

    // 3. SPA Fallback: If route is not a physical file (404), serve index.html
    if (response.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    }

    return response;
  },
};
