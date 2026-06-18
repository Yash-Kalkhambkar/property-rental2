// Vercel catch-all serverless function.
// Imports the TanStack Start SSR server built by `npm run build`
// and forwards every request to its Web Fetch handler.

import server from "../dist/server/server.js";

export default async function handler(req, res) {
  // Build a standard Request from the Vercel IncomingMessage
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const url = `${proto}://${host}${req.url}`;

  // Read body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
  });

  const response = await server.fetch(request, {}, {});

  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}
