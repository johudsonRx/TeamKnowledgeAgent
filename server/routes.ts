import type { Express } from "express";
import { createServer } from "http";
import { insertDocumentSchema, insertChatSchema } from "../shared/schema.js";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import path from "path";
import express from "express";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { getDB, initDB } from './connectToDB.js';
import { log } from './vite.js';
import { z } from 'zod';
import multer from 'multer';
import { processDocument } from './utils/documentProcessor.js';
import { chunkDocument } from './utils/documentChunking.js';
import { vectorizeChunks } from './utils/vectorization.js';

dotenv.config();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

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
  // Initialize database
  await initDB();

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

      const { title, content, vectorId } = req.body;
      const db = await getDB();
      
      // Insert document into PostgreSQL
      const result = await db.query(
        'INSERT INTO documents (title, content, vector_id) VALUES ($1, $2, $3) RETURNING *',
        [title || 'Untitled Document', content, vectorId || `vec_${Date.now()}`]
      );
      
      const document = result.rows[0];
      
      // Create and store chunks
      const chunks = chunkDocument(content, document.id.toString(), title);
      const vectorizedChunks = await vectorizeChunks(chunks);
      
      // Store chunks in document_chunks table
      for (const chunk of vectorizedChunks) {
        await db.query(
          'INSERT INTO document_chunks (content, embedding, metadata, document_id) VALUES ($1, $2, $3, $4)',
          [
            chunk.content, 
            JSON.stringify(chunk.embedding), 
            JSON.stringify(chunk.metadata),
            document.id
          ]
        );
      }

      log(`✅ Created ${vectorizedChunks.length} vectorized chunks for document ${document.id}`);

      res.json({ 
        success: true, 
        documentId: document.id,
        document: {
          id: document.id,
          content: document.content,
          createdAt: document.uploaded_at,
          title: document.title
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
      const result = await db.query('SELECT * FROM documents ORDER BY uploaded_at DESC');
      log(`📚 Retrieved ${result.rows.length} documents`);
      res.json(result.rows);
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
      
      const db = await getDB();
      
      // Delete document (chunks will be deleted via CASCADE)
      const result = await db.query('DELETE FROM documents WHERE id = $1 RETURNING id', [documentId]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      log('❌ Delete error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  });

  // Binary file upload route
  app.post("/api/documents/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const { title, type } = req.body;
      const buffer = req.file.buffer;
      
      log(`📝 Processing ${type} document "${title}" with ${buffer.length} bytes`);
      
      // Process the document based on type
      const processedDoc = await processDocument(buffer, type);
      
      // Create the document in the database
      const db = await getDB();
      const result = await db.query(
        'INSERT INTO documents (title, content, vector_id) VALUES ($1, $2, $3) RETURNING *',
        [title, processedDoc.textContent, `vec_${Date.now()}`]
      );
      
      const document = result.rows[0];

      // Create and store chunks
      const chunks = chunkDocument(processedDoc.textContent, document.id.toString(), title);
      const vectorizedChunks = await vectorizeChunks(chunks);
      
      // Store chunks in document_chunks table
      for (const chunk of vectorizedChunks) {
        await db.query(
          'INSERT INTO document_chunks (content, embedding, metadata, document_id) VALUES ($1, $2, $3, $4)',
          [
            chunk.content, 
            JSON.stringify(chunk.embedding), 
            JSON.stringify(chunk.metadata),
            document.id
          ]
        );
      }

      log(`✅ Created ${vectorizedChunks.length} vectorized chunks for document ${document.id}`);

      res.json({ 
        success: true, 
        documentId: document.id,
        chunksCount: vectorizedChunks.length,
        document: {
          id: document.id,
          title,
          content: processedDoc.textContent,
          vectorId: `vec_${Date.now()}`,
          uploadedAt: document.uploaded_at
        }
      });
    } catch (error) {
      log('❌ Error uploading document:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: 'Failed to upload document' });
    }
  });

  // Updated chat route with better error handling and model selection
  app.post("/api/chat", async (req, res) => {
    try {
      const { question } = req.body;
      log('❓ Question:', question);

      const db = await getDB();
      
      // First check if we have any documents
      const documentsResult = await db.query('SELECT COUNT(*) FROM documents');
      const documentCount = parseInt(documentsResult.rows[0].count);
      
      if (documentCount === 0) {
        // Store the "no documents" response in the chats collection
        const chatResult = await db.query(
          'INSERT INTO chats (question, answer, created_at) VALUES ($1, $2, NOW()) RETURNING *',
          [question, "No documents have been uploaded yet."]
        );
        
        return res.json({
          id: chatResult.rows[0].id,
          question,
          answer: "No documents have been uploaded yet.",
          createdAt: chatResult.rows[0].created_at
        });
      }

      // Get relevant content using vector similarity
      const questionEmbedding = await generateEmbedding(question);
      
      // Get all chunks
      const chunksResult = await db.query('SELECT * FROM document_chunks');
      const chunks = chunksResult.rows;
      
      let context;
      if (chunks.length > 0) {
        // Calculate similarity for each chunk
        const rankedChunks = chunks
          .map(chunk => ({
            ...chunk,
            embedding: JSON.parse(chunk.embedding),
            metadata: JSON.parse(chunk.metadata),
            similarity: cosineSimilarity(questionEmbedding, JSON.parse(chunk.embedding))
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 3);  // Take top 3 most similar chunks

        context = rankedChunks
          .map(chunk => chunk.content)
          .join('\n\n');
      } else {
        // Fallback to using full documents if no chunks
        const docsResult = await db.query('SELECT content FROM documents');
        context = docsResult.rows
          .map(doc => doc.content)
          .join('\n\n');
      }

      // Call Bedrock with better prompt
      const bedrockParams = {
        modelId: "anthropic.claude-v2",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          prompt: `\n\nHuman: You are a helpful AI assistant. You have access to code and configuration files. When asked about code, explain what it does clearly and technically. When asked about configuration values, you can describe their purpose but should not reveal exact values. If you do not have the information, say so, do not make up information. Also, if you do not have the information, do not reference another document that is in your database, just say that none of your knowledge base has the information. Here are the relevant documents:\n\n${context}\n\nBased on these documents, please answer this question: ${question}\n\nAssistant: `,
          max_tokens_to_sample: 2000,
          temperature: 0.7,
        })
      };

      // Call Bedrock
      const response = await bedrock.send(
        new InvokeModelCommand(bedrockParams)
      );

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const answer = responseBody.completion;

      // Store chat in PostgreSQL
      const chatResult = await db.query(
        'INSERT INTO chats (question, answer, created_at) VALUES ($1, $2, NOW()) RETURNING *',
        [question, answer]
      );
      
      const chat = chatResult.rows[0];

      return res.json({
        id: chat.id,
        question,
        answer,
        createdAt: chat.created_at
      });

    } catch (error) {
      log('❌ Chat error:', error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        error: 'Failed to process chat',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/chats", async (_req, res) => {
    try {
      const db = await getDB();
      const result = await db.query('SELECT * FROM chats ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      log('❌ Error fetching chats:', error);
      res.status(500).json({ error: 'Failed to fetch chats' });
    }
  });

  // Catch-all route to serve the frontend for any non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function for generating embeddings
async function generateEmbedding(text: string): Promise<number[]> {
  const params = {
    modelId: "amazon.titan-embed-text-v1",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      inputText: text
    })
  };

  const response = await bedrock.send(new InvokeModelCommand(params));
  const embedding = JSON.parse(new TextDecoder().decode(response.body)).embedding;
  return embedding;
}

// Cosine similarity for vector search
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}