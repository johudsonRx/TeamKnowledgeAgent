import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertDocumentSchema, insertChatSchema } from "@shared/schema";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

export async function registerRoutes(app: Express) {
  // Document routes
  app.post("/api/documents", async (req, res) => {
    try {
      const docData = insertDocumentSchema.parse(req.body);
      const doc = await storage.createDocument(docData);
      res.json(doc);
    } catch (error) {
      res.status(400).json({ error: "Invalid document data" });
    }
  });

  app.get("/api/documents", async (_req, res) => {
    const docs = await storage.getDocuments();
    res.json(docs);
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDocument(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ error: "Document not found" });
    }
  });

  // Chat routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { question } = req.body;
      
      // Get relevant documents for context
      const docs = await storage.getDocuments();
      const context = docs.map(d => d.content).join("\n");

      // Call Bedrock
      const prompt = `Context: ${context}\n\nQuestion: ${question}\n\nAnswer:`;
      const response = await bedrock.send(new InvokeModelCommand({
        modelId: "anthropic.claude-v2",
        body: JSON.stringify({
          prompt,
          max_tokens: 500,
          temperature: 0.7,
        }),
      }));

      const answer = JSON.parse(response.body.toString()).completion;

      const chat = await storage.createChat({
        question,
        answer,
        context: docs.map(d => ({ id: d.id, title: d.title })),
      });

      res.json(chat);
    } catch (error) {
      res.status(500).json({ error: "Failed to process chat" });
    }
  });

  app.get("/api/chats", async (_req, res) => {
    const chats = await storage.getChats();
    res.json(chats);
  });

  const httpServer = createServer(app);
  return httpServer;
}
