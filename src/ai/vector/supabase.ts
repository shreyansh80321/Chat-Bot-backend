import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { embeddings } from "../config.js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  console.warn(
    "Supabase vector search is disabled: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.",
  );
export const supabase = url && key ? createClient(url, key) : null;

export async function searchSimilarDocuments(
  query: string,
  userId: string,
  matchCount = 5,
) {
  if (!supabase) return [];
  const queryEmbedding = await embeddings.embedQuery(query);
  const matchThreshold = Number(process.env.RAG_MATCH_THRESHOLD ?? 0.35);
  console.log("[RAG_RETRIEVAL] querying documents", { userId, matchCount, matchThreshold, embeddingDimension: queryEmbedding.length });
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_user_id: userId,
  });
  if (error) throw error;
  const matches = (data ?? []) as Array<{ similarity: number }>;
  console.log("[RAG_RETRIEVAL] documents found", { count: matches.length, similarities: matches.map((document) => document.similarity) });
  return matches as Array<{
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
  }>;
}
