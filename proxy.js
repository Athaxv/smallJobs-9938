// Proxy: 4300 -> 8081 (Expo Metro)
// Strips Origin/Referer headers so Expo's CorsMiddleware doesn't block runable.site requests
const http = require('http');

const TARGET_HOST = 'localhost';
const TARGET_PORT = 8081;
const LISTEN_PORT = 4300;

http.createServer((req, res) => {
  // Strip headers that trigger Expo's CORS rejection
  const headers = { ...req.headers };
  delete headers['origin'];
  delete headers['referer'];
  headers['host'] = `${TARGET_HOST}:${TARGET_PORT}`;

  const options = {
    host: TARGET_HOST,
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers,
  };

  const proxy = http.request(options, (proxyRes) => {
    // Allow embedding from any origin
    const responseHeaders = { ...proxyRes.headers };
    responseHeaders['access-control-allow-origin'] = '*';
    responseHeaders['access-control-allow-headers'] = '*';
    res.writeHead(proxyRes.statusCode, responseHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  });

  req.pipe(proxy, { end: true });
}).listen(LISTEN_PORT, () => {
  console.log(`Proxy running: ${LISTEN_PORT} -> ${TARGET_PORT} (Origin header stripped)`);
});
