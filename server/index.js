import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import usersRouter from './routes/users.js';
import { basePath, port } from './config.js';

const app = express();
const resolvedBasePath = basePath || '/api';

app.use(cors());
app.use(express.json());
app.use(resolvedBasePath, usersRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (resolvedBasePath !== '/' && req.path.startsWith(resolvedBasePath)) {
    return res.status(404).json({ error: 'not_found' });
  }
  return res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`API server listening on ${port}`);
});
