import type { Request, Response, NextFunction } from "express";
import * as service from "./document.service.js";
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) { res.status(401).json({ success: false, message: "Unauthorized." }); return; }
    res.json({ success: true, data: await service.listDocuments(req.user.userId) });
  } catch (error) { next(error); }
}
export async function details(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) { res.status(401).json({ success: false, message: "Unauthorized." }); return; }
    const result = await service.getDocument(String(req.params.documentId), req.user.userId);
    if (!result) { res.status(404).json({ success: false, message: "Document not found." }); return; }
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
}
export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || !req.file) { res.status(400).json({ success: false, message: "A PDF file is required." }); return; }
    const result = await service.ingestPdf(req.file, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("[DOCUMENT_UPLOAD_ERROR]", error);
    next(error);
  }
}
