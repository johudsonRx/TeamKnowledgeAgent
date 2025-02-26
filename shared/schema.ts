import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  vectorId: text("vector_id").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  context: jsonb("context").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  title: true,
  content: true,
  vectorId: true,
});

export const insertChatSchema = createInsertSchema(chats).pick({
  question: true,
  answer: true,
  context: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export interface Chat {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
  documentRefs: Array<{ id: string; title: string }>;
}
export type InsertChat = z.infer<typeof insertChatSchema>;
