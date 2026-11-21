import { randomUUID } from "node:crypto";
import { PDFParse } from "pdf-parse";
import { embeddings } from "../ai/config.js";
import { supabase } from "../ai/vector/supabase.js";

const chunkText = (text: string, size = 1000, overlap = 150) => { const chunks: string[] = []; for (let start = 0; start < text.length; start += size - overlap) { const chunk = text.slice(start, start + size).trim(); if (chunk) chunks.push(chunk); } return chunks; };
export async function ingestPdf(file: Express.Multer.File, userId: string) {
  if (!supabase) throw new Error("Supabase vector storage is not configured.");
  console.log("[DOCUMENT_UPLOAD] received PDF", { fileName: file.originalname, size: file.size, mimeType: file.mimetype });
  const parser = new PDFParse({ data: file.buffer });
  try {
    const result = await parser.getText();
    console.log("[DOCUMENT_UPLOAD] PDF text extracted", { characters: result.text.length });
    const chunks = chunkText(result.text);
    if (!chunks.length) throw new Error("No readable text was found in the PDF.");
    console.log("[DOCUMENT_UPLOAD] text chunked", { chunks: chunks.length });
    const vectors = await embeddings.embedDocuments(chunks);
    const dimensions = [...new Set(vectors.map((vector) => vector.length))];
    console.log("[DOCUMENT_UPLOAD] embeddings generated", { vectors: vectors.length, dimensions });
    if (vectors.length !== chunks.length || dimensions.length !== 1 || dimensions[0] !== 768) {
      throw new Error(`Invalid embedding shape: expected ${chunks.length} vectors of dimension 768, received ${vectors.length} vectors with dimensions ${dimensions.join(", ") || "none"}.`);
    }
    const documentId = randomUUID();
    const rows = chunks.map((content, index) => ({ document_id: documentId, user_id: userId, file_name: file.originalname, content, metadata: { fileName: file.originalname, chunkIndex: index, mimeType: file.mimetype }, embedding: vectors[index] }));
    const { error } = await supabase.from("documents").insert(rows);
    if (error) throw error;
    console.log("[DOCUMENT_UPLOAD] vectors stored", { documentId, rows: rows.length });
    return { documentId, fileName: file.originalname, chunks: chunks.length };
  } finally { await parser.destroy(); }
}

export async function listDocuments(userId: string) {
  if (!supabase) throw new Error("Supabase vector storage is not configured.");
  const { data, error } = await supabase
    .from("documents")
    .select("document_id,file_name,metadata")
    .eq("user_id", userId)
    .not("document_id", "is", null);
  if (error) throw error;
  const documents = new Map<string, { documentId: string; fileName: string; chunks: number }>();
  for (const row of data ?? []) {
    const documentId = row.document_id;
    if (!documentId) continue;
    const item = documents.get(documentId) ?? {
      documentId,
      fileName: row.file_name || String(row.metadata?.fileName || "Untitled PDF"),
      chunks: 0,
    };
    item.chunks += 1;
    documents.set(documentId, item);
  }
  return [...documents.values()];
}

export async function getDocument(documentId: string, userId: string) {
  if (!supabase) throw new Error("Supabase vector storage is not configured.");
  const { data, error } = await supabase
    .from("documents")
    .select("document_id,file_name,metadata,content")
    .eq("user_id", userId)
    .eq("document_id", documentId);
  if (error) throw error;
  if (!data?.length) return null;
  const chunks = [...data].sort((a, b) => Number(a.metadata?.chunkIndex ?? 0) - Number(b.metadata?.chunkIndex ?? 0));
  return {
    documentId,
    fileName: chunks[0]?.file_name || String(chunks[0]?.metadata?.fileName || "Untitled PDF"),
    content: chunks.map((chunk) => chunk.content).join("\n\n"),
    chunks: chunks.length,
  };
}
