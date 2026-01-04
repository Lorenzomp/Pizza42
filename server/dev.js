import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createServer as createViteServer } from 'vite';
import usersRouter from './routes/users.js';
import { basePath } from './config.js';
import { jwtCheck } from './auth.js';

const app = express();
const resolvedBasePath = basePath || '';
const apiMountPath = resolvedBasePath || '/';
const healthPath = resolvedBasePath ? `${resolvedBasePath}/health` : '/health';
const port = Number(process.env.PORT || 3000);
const host = '0.0.0.0';

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection', reason);
});

console.log('Booting dev server', {
  basePath: resolvedBasePath || '/',
  port,
});

app.use(cors());
app.use(express.json());

if (!jwtCheck) {
  console.error('Missing Auth0 JWT configuration; API endpoints are disabled.');
  app.use(apiMountPath, (req, res) =>
    res.status(500).json({ error: 'auth_config_missing' }),
  );
} else {
  app.use(apiMountPath, jwtCheck);
}

app.get(healthPath, (req, res) => res.status(200).json({ status: 'ok' }));
app.use(apiMountPath, usersRouter);
app.use(apiMountPath, (req, res) => res.status(404).json({ error: 'not_found' }));

const vite = await createViteServer({
  appType: 'spa',
  server: {
    middlewareMode: true,
  },
});

app.use(vite.middlewares);

app.use('*', async (req, res, next) => {
  const isApiRequest =
    resolvedBasePath &&
    (req.path === resolvedBasePath ||
      req.path.startsWith(`${resolvedBasePath}/`));
  if (isApiRequest) {
    return res.status(404).json({ error: 'not_found' });
  }

  try {
    const templatePath = path.resolve(process.cwd(), 'index.html');
    const template = await fs.readFile(templatePath, 'utf-8');
    const html = await vite.transformIndexHtml(req.originalUrl, template);
    res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
  } catch (error) {
    next(error);
  }
});

app.listen(port, host, () => {
  console.log(`Dev server listening on http://${host}:${port}`);
});
