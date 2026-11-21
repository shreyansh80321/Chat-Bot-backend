import express from 'express'
import dotenv from 'dotenv'
import { connectDb } from './config/prisma.js';
import authRoutes from './modules/auth.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import conversationRoutes from './modules/conversation.routes.js';
import chatRoutes from './modules/chat.routes.js';
import documentRoutes from './modules/document.routes.js';
dotenv.config();
const app = express();
const parsedPort = Number(process.env.PORT);
const PORT = Number.isInteger(parsedPort) && parsedPort >= 0 && parsedPort < 65536 ? parsedPort : 5000;
const allowedOrigins = new Set(
  (process.env.FRONTEND_URLS ?? "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(express.json({ limit: "12mb" }));
app.use((req, res, next) => { const raw = req.headers.cookie ?? ""; req.cookies = Object.fromEntries(raw.split(";").filter(Boolean).map((part) => { const [key, ...value] = part.trim().split("="); return [key, decodeURIComponent(value.join("="))]; })); next(); });
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Id");
    res.setHeader("Access-Control-Allow-Credentials", "true");
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
app.use('/api/chat', chatRoutes);
app.use('/api/documents', documentRoutes);
app.use(errorHandler);
connectDb();
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

server.on("error", (error) => {
  console.error("Failed to start HTTP server:", error);
  process.exit(1);
});
