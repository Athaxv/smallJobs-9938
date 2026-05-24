import { Hono } from 'hono';
import { cors } from "hono/cors";
import { profileRoutes } from "./routes/profile";
import { authRoutes } from "./routes/auth";
import aiRoutes from './routes/ai';
import { postRoutes } from './routes/posts';
import { responseRoutes } from './routes/responses';
import { messageRoutes } from './routes/messages';
import { notificationRoutes } from './routes/notifications';

const app = new Hono()
  .use(cors({
    origin: (origin) => origin ?? "*",
    credentials: true,
  }))
  .basePath("api")
  .get('/health', (c) => c.json({ status: 'ok' }, 200))
  .get('/ping', (c) => c.json({ message: `Pong! ${Date.now()}` }, 200))
  .route('/auth', authRoutes)
  .route('/profile', profileRoutes)
  .route('/ai', aiRoutes)
  .route('/posts', postRoutes)
  .route('/responses', responseRoutes)
  .route('/messages', messageRoutes)
  .route('/notifications', notificationRoutes);

export type AppType = typeof app;
export default app;
