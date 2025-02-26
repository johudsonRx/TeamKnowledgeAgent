import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage/index";
import { insertDocumentSchema, insertChatSchema } from "../shared/schema";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import path from "path";
import express from "express";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { getDB } from './connectToDB';
import { log } from './vite';  // Import the logger
import { z } from 'zod';

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
  log('⚠️ AWS credentials are not properly configured');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the expected chat response schema
const chatResponseSchema = z.object({
  answer: z.string(),
  context: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.object({}),
    z.array(z.any())
  ])
});

export async function registerRoutes(app: Express) {
  // Serve static files from the client build directory
  app.use(express.static(path.join(__dirname, "../client/dist")));

  // Document routes
  app.post("/api/documents", async (req, res) => {
    try {
      // Log the incoming request body
      log('📝 Received document data:', req.body);

      // Validate the document data
      if (!req.body || !req.body.content) {
        log('❌ Invalid document data received');
        return res.status(400).json({ error: 'Invalid document data' });
      }

      const db = await getDB();
      const collection = db.collection('documents');
      
      // Insert the document
      const result = await collection.insertOne({
        content: req.body.content,
        createdAt: new Date(),
        // Add any other fields you need
      });

      log('✅ Document created:', result.insertedId);
      res.json({ success: true, documentId: result.insertedId });
      
    } catch (error) {
      log('❌ Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });

  app.get("/api/documents", async (req, res) => {
    try {
      const db = await getDB();
      const collection = db.collection('documents');
      const documents = await collection.find({}).toArray();
      log(`📚 Retrieved ${documents.length} documents`);
      res.json(documents);
    } catch (error) {
      log('❌ Error fetching documents:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const db = await getDB();
      const collection = db.collection('documents');
      const result = await collection.deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: "Document not found" });
      } else {
        res.status(204).send();
      }
    } catch (error) {
      res.status(404).json({ error: "Document not found" });
    }
  });

  // Updated chat route with better error handling and model selection
  app.post("/api/chat", async (req, res) => {
    try {
      const { question } = req.body;
      log('❓ Question:', question);

      const db = await getDB();
      const collection = db.collection('documents');
      
      // Fetch documents from MongoDB
      const documents = await collection.find({}).toArray();
      
      // Create a context string from the documents
      const context = documents.map(doc => doc.content).join('\n\n');

      // Update the prompt to include the context
      const bedrockParams = {
        modelId: "anthropic.claude-v2",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          prompt: `\n\nHuman: You are a helpful assistant that helps a human finding whatever information that they ask you for in your database. The human has uploaded documents to you to centralize their information and find it faster without having to search through all the documents. Your job is to answer the question based on the documents in your database. If the answer is not in the documents, then say so without revealing the contents of the document. Here are some documents to reference:\n\n${context}\n\nBased on the above documents, please answer this question: ${question}\n\nAssistant: `,
          max_tokens_to_sample: 2000,
          temperature: 0.7,
          top_p: 1,
          stop_sequences: ["\n\nHuman:"]
        })
      };

      // Call Bedrock
      const response = await bedrock.send(
        new InvokeModelCommand(bedrockParams)
      );

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const answer = responseBody.completion;

      // Get chat collection
      const chatsCollection = db.collection('chats');
      
      // Create chat document
      const chatDoc = {
        question,
        answer,
        createdAt: new Date()
      };
      
      const result = await chatsCollection.insertOne(chatDoc);

      return res.json({
        id: result.insertedId.toString(),
        question,
        answer,
        createdAt: new Date()
      });

    } catch (error) {
      log('❌ Chat error:', error);
      res.status(500).json({ 
        error: 'Failed to process chat',
        details: error.toString()
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