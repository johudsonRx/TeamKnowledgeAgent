import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage/index.js";
import { insertDocumentSchema, insertChatSchema } from "../shared/schema.js";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import path from "path";
import express from "express";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { getDB } from './connectToDB.js';
import { log } from './vite.js';  // Import the logger
import { z } from 'zod';
import { ObjectId } from 'mongodb';  // Add this import
import { detectPII } from './utils/piiDetection.js';
import { generateEmbedding, cosineSimilarity, testSimilarity, type VectorizedChunk, vectorizeChunks } from './utils/vectorization.js';
import { chunkDocument } from "./utils/documentChunking.js";

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
      const { content, title } = req.body;
      const db = await getDB();
      
      // First create the main document
      const documentsCollection = db.collection('documents');
      const result = await documentsCollection.insertOne({
        title,
        content,
        vectorId: `vec_${Date.now()}`,
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

      // Create and store chunks
      const chunks = chunkDocument(content, result.insertedId.toString(), title);
      const vectorizedChunks = await vectorizeChunks(chunks);
      
      // Store chunks in document_chunks collection
      const chunksCollection = db.collection('document_chunks');
      await chunksCollection.insertMany(vectorizedChunks);

      log(`✅ Created ${vectorizedChunks.length} vectorized chunks for document ${result.insertedId}`);

      res.json({ 
        success: true, 
        documentId: result.insertedId,
        chunksCount: vectorizedChunks.length,
        document: {
          id: result.insertedId,
          title,
          content,
          vectorId: `vec_${Date.now()}`,
          uploadedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      log('❌ Error uploading document:', error instanceof Error ? error.message : String(error));
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
      log('❌ Error fetching documents:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  app.delete('/api/documents/:id', async (req, res) => {
    try {
      const documentId = req.params.id;
      
      // Validate that we have a document ID
      if (!documentId) {
        return res.status(400).json({ error: 'Document ID is required' });
      }
      
      // Validate that the ID is a valid ObjectId
      if (!ObjectId.isValid(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID format' });
      }

      const db = await getDB();
      const collection = db.collection('documents');
      
      const result = await collection.deleteOne({ _id: new ObjectId(documentId) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  // Updated chat route with better error handling and model selection
  app.post("/api/chat", async (req, res) => {
    try {
      const { question } = req.body;
      const db = await getDB();
      
      // First check if we have any documents
      const documentsCollection = db.collection('documents');
      const documents = await documentsCollection.find({}).toArray();
      
      if (documents.length === 0) {
        return res.json({
          answer: "No documents have been uploaded yet.",
          context: []
        });
      }

      // Get relevant content using vector similarity
      const questionEmbedding = await generateEmbedding(question);
      const chunksCollection = db.collection('document_chunks');
      const chunks = await chunksCollection.find({}).toArray();
      let context;
      if (chunks.length > 0) {
        const rankedChunks = chunks
          .map(chunk => ({
            ...chunk as unknown as VectorizedChunk,
            similarity: cosineSimilarity(questionEmbedding, chunk.embedding)
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3);  // Take top 3 most similar chunks

        context = rankedChunks
          .map(chunk => chunk.content)
          .join('\n\n');
      } else {
        // Fallback to using full documents if no chunks
        context = documents
          .map(doc => doc.content)
          .join('\n\n');
      }

      // Call Bedrock with better prompt
      const bedrockParams = {
        modelId: "anthropic.claude-v2",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          prompt: `\n\nHuman: You are a helpful AI assistant. You have access to code and configuration files. When asked about code, explain what it does clearly and technically. When asked about configuration values, you can describe their purpose but should not reveal exact values. Here are the relevant documents:\n\n${context}\n\nBased on these documents, please answer this question: ${question}\n\nAssistant: `,
          max_tokens_to_sample: 2000,
          temperature: 0.7,
        })
      };

      const response = await bedrock.send(new InvokeModelCommand(bedrockParams));
      const answer = JSON.parse(new TextDecoder().decode(response.body)).completion;

      // Store chat with context info
      const result = await db.collection('chats').insertOne({
        question,
        answer,
        createdAt: new Date()
      });

      return res.json({
        id: result.insertedId.toString(),
        question,
        answer,
        createdAt: new Date()
      });

    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat' });
    }
  });

  app.get("/api/chats", async (_req, res) => {
    const chats = await storage.getChats();
    res.json(chats);
  });

  // Test endpoint for vector search
  app.post("/api/test-vectors", async (req, res) => {
    try {
      const { question } = req.body;
      const questionEmbedding = await generateEmbedding(question);
      const db = await getDB();
      const chunks = await db.collection('document_chunks').find({}).toArray();
      
      // Cast chunks to VectorizedChunk type since we know the structure matches
      const results = testSimilarity(questionEmbedding, chunks as unknown as VectorizedChunk[]);
      res.json({
        questionEmbedding: questionEmbedding.slice(0, 5),
        totalChunks: chunks.length,
        topResults: results.slice(0, 5)
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Catch-all route to serve the frontend for any non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });

  const httpServer = createServer(app);
  return httpServer;
}