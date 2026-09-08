import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/api.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static UI assets
  app.use(express.static(path.join(__dirname, 'public')));

  // Mount API endpoints
  app.use('/api', apiRoutes);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'GDG Event Hub', timestamp: new Date().toISOString() });
  });

  return app;
}
