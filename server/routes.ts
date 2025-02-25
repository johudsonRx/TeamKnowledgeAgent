import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage/index";
import { insertDocumentSchema, insertChatSchema } from "@shared/schema";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import path from "path";
import express from "express";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { getDocuments } from "./storage/index";
dotenv.config();

const bedrock = new BedrockRuntimeClient({ 
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Add some error handling
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  console.error('AWS credentials are not properly configured');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function registerRoutes(app: Express) {
  // Serve static files from the client build directory
  app.use(express.static(path.join(__dirname, "../client/dist")));

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

  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await getDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
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

  // Updated chat route with better error handling and model selection
  app.post("/api/chat", async (req, res) => {
    try {
      const { question } = req.body;
      if (!question?.trim()) {
        return res.status(400).json({ error: "Question is required" });
      }

      // Get relevant documents for context
      const docs = await storage.getDocuments();
      const context = docs.length ? docs.map(d => d.content).join("\n") : "";

      // Try multiple Bedrock models
      const modelConfigs = [
        {
          modelId: "mistral.mistral-7b-instruct-v0:2",
          formatRequest: () => ({
            prompt: `Context: ${context}\n\nQuestion: ${question}\n\nAnswer the question based on the context provided. If the answer cannot be found in the context, say so.`,
            max_tokens: 500,
            temperature: 0.7,
          }),
          parseResponse: (body: any) => body.completion
        }
      ];

      let lastError = null;
      for (const config of modelConfigs) {
        try {
          console.log(`Trying model: ${config.modelId}`);
          const response = await bedrock.send(new InvokeModelCommand({
            modelId: config.modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(config.formatRequest())
          }));

          const responseBody = JSON.parse(new TextDecoder().decode(response.body));
          const answer = config.parseResponse(responseBody);

          const chat = await storage.createChat({
            question,
            answer,
            context: docs.map(d => ({ id: d.id, title: d.title })),
          });

          return res.json(chat);
        } catch (error: any) {
          console.error(`Error with model ${config.modelId}:`, error);
          lastError = error;
          // Continue to next model if available
        }
      }

      // If we get here, all models failed
      console.error('All models failed. Last error:', lastError);
      if (lastError?.message?.includes('AccessDeniedException')) {
        return res.status(401).json({
          error: "AWS Bedrock Access Denied",
          details: "Please ensure your AWS credentials have access to Bedrock service and the specified models."
        });
      } else if (lastError?.message?.includes('ValidationException')) {
        return res.status(400).json({
          error: "Invalid Request to Bedrock",
          details: "The request format was invalid. This might be due to an unsupported model configuration."
        });
      } else if (lastError?.message?.includes('ThrottlingException')) {
        return res.status(429).json({
          error: "Rate Limited",
          details: "Too many requests to Bedrock. Please try again later."
        });
      }

      res.status(500).json({ 
        error: "Failed to process chat",
        details: lastError?.message || "Unknown error"
      });
    } catch (error: any) {
      console.error('Chat API Error:', error);
      res.status(500).json({ 
        error: "Failed to process chat",
        details: error?.message || "Unknown error"
      });
    }
  });

  app.get("/api/chats", async (_req, res) => {
    const chats = await storage.getChats();
    res.json(chats);
  });

  // Catch-all route to serve the frontend for any non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });

  const httpServer = createServer(app);
  return httpServer;
}