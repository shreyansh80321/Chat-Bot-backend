import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const structured = error && typeof error === "object" ? error as Record<string, unknown> : {};
  console.error("[ERROR_HANDLER]", {
    name: error instanceof Error ? error.name : structured.name,
    message: error instanceof Error ? error.message : structured.message,
    code: structured.code,
    details: structured.details,
    hint: structured.hint,
    status: structured.status,
    stack: error instanceof Error ? error.stack : undefined,
    cause: error instanceof Error ? error.cause : structured.cause,
  });
  const message = error instanceof Error ? error.message : typeof structured.message === "string" ? structured.message : "Internal server error.";
  res.status(message.toLowerCase().includes("token") ? 401 : 500).json({ success: false, message });
};
