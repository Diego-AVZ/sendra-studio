import fs from 'node:fs';
import type { IncomingMessage } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function lanHosts() {
  const hosts: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      const family = String(net.family);
      const v4 = family === 'IPv4' || family === '4';
      if (!v4 || net.internal || net.address.startsWith('169.254.')) continue;
      hosts.push(net.address);
    }
  }
  const rank = (ip: string) => (ip.startsWith('192.168.') || ip.startsWith('10.') || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ? 1 : 0);
  return hosts.sort((a, b) => rank(b) - rank(a));
}

const publishedFile = path.resolve('.sendra-lan.json');

function readBody(req: IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function loadPublished() {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(publishedFile, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Map<string, unknown>();
    return new Map(Object.entries(parsed as Record<string, unknown>));
  } catch {
    return new Map<string, unknown>();
  }
}

function lanLink(): Plugin {
  const published = loadPublished();
  const save = () => {
    fs.writeFileSync(publishedFile, JSON.stringify(Object.fromEntries(published)));
  };
  return {
    name: 'lan-link',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0] ?? '';
        if (req.method === 'GET' && url === '/__lan.json') {
          const address = server.httpServer?.address();
          const port = typeof address === 'object' && address ? address.port : server.config.server.port;
          const urls = lanHosts().map((host) => `http://${host}:${port}/`);
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ urls }));
          return;
        }
        if (url.startsWith('/__published/') && (req.method === 'GET' || req.method === 'DELETE')) {
          const slug = decodeURIComponent(url.slice('/__published/'.length));
          if (req.method === 'DELETE') {
            published.delete(slug);
            save();
            res.statusCode = 204;
            res.end();
            return;
          }
          const doc = published.get(slug);
          if (!doc) {
            res.statusCode = 404;
            res.end('{}');
            return;
          }
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify(doc));
          return;
        }
        if (req.method === 'POST' && url === '/__published') {
          void readBody(req)
            .then((raw) => {
              const doc = JSON.parse(raw) as { meta?: { id?: string; slug?: string; status?: string } };
              const slug = doc.meta?.slug;
              if (!slug || doc.meta?.status !== 'published') {
                res.statusCode = 400;
                res.end();
                return;
              }
              for (const [key, value] of published) {
                const meta = (value as { meta?: { id?: string } }).meta;
                if (meta?.id && meta.id === doc.meta?.id && key !== slug) published.delete(key);
              }
              published.set(slug, doc);
              save();
              res.statusCode = 204;
              res.end();
            })
            .catch(() => {
              res.statusCode = 400;
              res.end();
            });
          return;
        }
        next();
      });
    },
  };
}

function pagesBase() {
  const raw = process.env.VITE_BASE?.trim();
  if (!raw || raw === '/') return '/';
  const withLead = raw.startsWith('/') ? raw : `/${raw}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

function pagesFallback(): Plugin {
  return {
    name: 'pages-fallback',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve('dist');
      const index = path.join(dist, 'index.html');
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(dist, '404.html'));
    },
  };
}

export default defineConfig({
  base: pagesBase(),
  plugins: [react(), lanLink(), pagesFallback()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5190,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 5190,
    strictPort: true,
  },
});
