import express from 'express'
import dotenv from 'dotenv'
import { connectDb } from './config/prisma.js';
import authRoutes from './modules/auth.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import conversationRoutes from './modules/conversation.routes.js';
dotenv.config();
const app = express();
const parsedPort = Number(process.env.PORT);
const PORT = Number.isInteger(parsedPort) && parsedPort >= 0 && parsedPort < 65536 ? parsedPort : 5000;

app.use(express.json());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Id");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use((req, _res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});
app.get('/health', (_req, res) => res.json({ success: true, message: 'OK' }));
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use(errorHandler);
connectDb();
const server = app.listen(PORT, "localhost", () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("Failed to start HTTP server:", error);
  process.exit(1);
});
