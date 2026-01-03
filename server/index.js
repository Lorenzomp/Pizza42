import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

console.log('Booting API server', {
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
  // Enforce JWT validation on all API endpoints.
  app.use(apiMountPath, jwtCheck);
}

app.get(healthPath, (req, res) => res.status(200).json({ status: 'ok' }));
app.use(apiMountPath, usersRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  const isApiRequest =
    resolvedBasePath &&
    (req.path === resolvedBasePath ||
      req.path.startsWith(`${resolvedBasePath}/`));
  if (isApiRequest) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`API server listening on http://${host}:${port}`);
});
