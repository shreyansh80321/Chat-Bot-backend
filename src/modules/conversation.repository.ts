import { randomUUID } from "node:crypto";
import prisma from "../config/prisma.js";
import { MessageRole } from "../generated/prisma/enums.js";

export const listConversations = (userId: string) => prisma.conversation.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
export const createConversation = (userId: string, title?: string) => prisma.conversation.create({ data: { userId, threadId: randomUUID(), title: title?.trim() || "New conversation" } });
export const findConversation = (userId: string, threadId: string) => prisma.conversation.findFirst({ where: { userId, threadId }, include: { messages: { orderBy: { createdAt: "asc" } } } });
export const addMessage = async (userId: string, threadId: string, role: MessageRole, content: string) => {
  const conversation = await prisma.conversation.findFirst({ where: { userId, threadId }, select: { id: true } });
  if (!conversation) return null;
  return prisma.$transaction([prisma.message.create({ data: { conversationId: conversation.id, role, content } }), prisma.conversation.update({ where: { id: conversation.id }, data: {} })]);
};
