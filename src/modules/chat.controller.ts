import type { Request, Response, NextFunction } from "express";
import { runChatGraph } from "../ai/graph/chat.graph.js";
import * as conversations from "./conversation.repository.js";

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const question =
      typeof req.body?.question === "string" ? req.body.question.trim() : "";
    const threadId =
      typeof req.body?.threadId === "string" ? req.body.threadId : "";
    const imageData =
      typeof req.body?.imageData === "string" && req.body.imageData.startsWith("data:image/")
        ? req.body.imageData
        : undefined;
    if (!question || !threadId || !req.user) {
      res
        .status(400)
        .json({
          success: false,
          message: "threadId and question are required.",
        });
      return;
    }
    console.log("[CHAT_REQUEST] received", { threadId, userId: req.user.userId, questionLength: question.length });
    const result = await conversations.addMessage(
      req.user.userId,
      threadId,
      "USER" as never,
      question,
    );
    if (!result) {
      res
        .status(404)
        .json({ success: false, message: "Conversation not found." });
      return;
    }
    const graphResult = await runChatGraph(question, req.user.userId, imageData);
    const answer = graphResult.sources.length
      ? `${graphResult.answer}\n\n**Sources**\n${graphResult.sources.map((source) => `- ${source.fileName} · section ${source.chunkIndex + 1}`).join("\n")}`
      : graphResult.answer;
    await conversations.addMessage(
      req.user.userId,
      threadId,
      "ASSISTANT" as never,
      answer,
    );
    res.json({ success: true, data: { threadId, answer } });
  } catch (error) {
    next(error);
  }
}
