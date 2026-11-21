import { randomUUID } from "node:crypto";
import prisma from "../config/prisma.js";
import { MessageRole } from "../generated/prisma/enums.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { chatModel } from "../ai/config.js";

export const listConversations = (userId: string) => prisma.conversation.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
export const createConversation = (userId: string, title?: string) => prisma.conversation.create({ data: { userId, threadId: randomUUID(), title: title?.trim() || "New conversation" } });
export const findConversation = (userId: string, threadId: string) => prisma.conversation.findFirst({ where: { userId, threadId }, include: { messages: { orderBy: { createdAt: "asc" } } } });
async function makeShortTitle(question: string) {
  try {
    const result = await chatModel.invoke([
      new SystemMessage("Create a meaningful conversation title from the user question. Reply with exactly 2 or 3 words, title case, no punctuation, no quotes, and no explanation."),
      new HumanMessage(question),
    ]);
    const title = String(result.content).replace(/[\"'.,!?():;*_#\n\r]/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 3).join(" ");
    if (title.split(" ").length >= 2) return title;
  } catch (error) {
    console.error("[CONVERSATION_TITLE] generation failed", error);
  }
  return question.replace(/[^a-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 3).join(" ") || "New conversation";
}
export const addMessage = async (userId: string, threadId: string, role: MessageRole, content: string) => {
  const conversation = await prisma.conversation.findFirst({ where: { userId, threadId }, select: { id: true, title: true } });
  if (!conversation) return null;
  const firstQuestionTitle = role === MessageRole.USER && conversation.title === "New conversation" ? await makeShortTitle(content) : conversation.title;
  return prisma.$transaction([
    prisma.message.create({ data: { conversationId: conversation.id, role, content } }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { ...(role === MessageRole.USER && conversation.title === "New conversation" ? { title: firstQuestionTitle } : {}) },
    }),
  ]);
};
