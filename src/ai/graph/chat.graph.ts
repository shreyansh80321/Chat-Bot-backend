import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { chatModel } from "../config.js";
import { searchSimilarDocuments } from "../vector/supabase.js";
import { webSearch } from "../web-search.js";

const State = Annotation.Root({
  question: Annotation<string>,
  userId: Annotation<string>,
  isRealtime: Annotation<boolean>,
  context: Annotation<string>,
  answer: Annotation<string>,
  sources: Annotation<Array<{ fileName: string; chunkIndex: number }>>,
  imageData: Annotation<string | undefined>,
});
const textOf = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value);
const answerStyle = "Format the response as clean Markdown for a chat UI. Use a short heading when useful, short paragraphs, bullet or numbered lists for multiple items, bold labels for important values, and blank lines between sections. Do not use a preamble, giant blocks of text, or raw JSON unless the user asks for it.";

async function classify(state: typeof State.State) {
  console.log("[RAG_GRAPH] classifying question", { questionLength: state.question.length });
  const result = await chatModel.invoke([
    new SystemMessage(
      "Classify the user question. Reply with only REALTIME or KNOWLEDGE. REALTIME means current news, live status, weather, prices, schedules, or information requiring the internet. KNOWLEDGE means it can be answered from stored documents or general knowledge.",
    ),
    new HumanMessage(state.question),
  ]);
  const classification = textOf(result.content).trim().toUpperCase();
  const isRealtime = classification.includes("REALTIME");
  console.log("[RAG_GRAPH] classification result", { classification, isRealtime });
  return { isRealtime };
}
async function realtime(state: typeof State.State) {
  const weatherMatch = state.question.match(
    /(?:weather|temperature|forecast|conditions?|rain|humidity|wind)[^\n]*?(?:in|at|for)\s+([a-zA-Z][a-zA-Z .'-]{1,60})/i,
  );
  if (weatherMatch) {
    const location = weatherMatch[1]!.trim().replace(/[?.!,]+$/, "");
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`,
    );
    const geo = (await geoResponse.json()) as {
      results?: Array<{
        latitude: number;
        longitude: number;
        name: string;
        country: string;
      }>;
    };
    const place = geo.results?.[0];
    if (place) {
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`,
      );
      const weather = (await weatherResponse.json()) as {
        current?: Record<string, number | string>;
        current_units?: Record<string, string>;
      };
      const result = await chatModel.invoke([
        new SystemMessage(
          `${answerStyle} Answer briefly using the live weather data provided. Do not claim you lack real-time access.`,
        ),
        new HumanMessage(
          `${state.question}\n\nLive data for ${place.name}, ${place.country}: ${JSON.stringify(weather.current)} ${JSON.stringify(weather.current_units)}`,
        ),
      ]);
      return { answer: textOf(result.content) };
    }
  }
  try {
    const results = await webSearch(state.question);
    if (results.length) {
      const result = await chatModel.invoke([
        new SystemMessage(`${answerStyle} Answer using the web results below. Cite sources inline as Markdown links. Be clear that the information is current as of the retrieved sources.`),
        new HumanMessage(`${state.question}\n\nWeb results:\n${results.map((item) => `- [${item.title}](${item.url})\n  ${item.content}`).join("\n")}`),
      ]);
      return { answer: textOf(result.content) };
    }
  } catch (error) {
    console.error("[WEB_SEARCH] failed", error);
  }
  const result = await chatModel.invoke([
    new SystemMessage(
      `${answerStyle} Answer briefly and honestly. No live tool was available for this real-time request, so explain that without inventing current facts.`,
    ),
    new HumanMessage(state.question),
  ]);
  return { answer: textOf(result.content) };
}
async function retrieve(state: typeof State.State) {
  const documents = await searchSimilarDocuments(state.question, state.userId);
  console.log("[RAG_GRAPH] retrieved context", { userId: state.userId, documents: documents.length, contextCharacters: documents.reduce((total, document) => total + document.content.length, 0) });
  return {
    context: documents.map((document) => document.content).join("\n\n"),
    sources: documents.map((document) => ({
      fileName: String(document.metadata?.fileName ?? "Uploaded document"),
      chunkIndex: Number(document.metadata?.chunkIndex ?? 0),
    })),
  };
}
async function answer(state: typeof State.State) {
  const instruction = state.context
    ? `Use only the context below when it is relevant. If it does not answer the question, say you could not find it in the documents.\n\nContext:\n${state.context}`
    : "No relevant document context was found. Answer briefly from your general knowledge and clearly say when you are uncertain.";
  const userContent = state.imageData
    ? [{ type: "text" as const, text: state.question }, { type: "image_url" as const, image_url: { url: state.imageData } }]
    : state.question;
  const result = await chatModel.invoke([
    new SystemMessage(`${instruction}\n${answerStyle}\nKeep the answer concise.`),
    new HumanMessage(userContent),
  ]);
  return { answer: textOf(result.content) };
}
const graph = new StateGraph(State)
  .addNode("classify", classify)
  .addNode("realtime", realtime)
  .addNode("retrieve", retrieve)
  .addNode("generateAnswer", answer)
  .addEdge(START, "classify")
  .addConditionalEdges("classify", (state) =>
    state.isRealtime ? "realtime" : "retrieve",
  )
  .addEdge("realtime", END)
  .addEdge("retrieve", "generateAnswer")
  .addEdge("generateAnswer", END)
  .compile();
export async function runChatGraph(question: string, userId: string, imageData?: string) {
  return graph.invoke({
    question,
    userId,
    isRealtime: false,
    context: "",
    answer: "",
    sources: [],
    imageData,
  });
}
