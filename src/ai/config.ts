import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const apiKey = process.env.GROQ_API_KEY;
const baseURL = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
if (!apiKey) console.warn("Groq is disabled: GROQ_API_KEY is missing.");
export const chatModel = new ChatOpenAI({ apiKey: apiKey ?? "missing", configuration: { baseURL }, model: process.env.GROQ_CHAT_MODEL ?? "openai/gpt-oss-20b", temperature: 0.2 });

const embeddingApiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!embeddingApiKey) console.warn("Gemini embeddings are disabled: GOOGLE_GEMINI_API_KEY is missing.");

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: embeddingApiKey ?? "missing",
  model: process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001",
  outputDimensionality: 768,
});
