import { MongoClient, ObjectId } from "mongodb";
import type { Document, Chat } from "./types.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MONGODB_URI = process.env.DOCDB_URI || process.env.MONGODB_URI;

// Configure MongoDB/DocumentDB client
const client = new MongoClient(MONGODB_URI!, {
  ...(process.env.DOCDB_URI ? {
    tls: true,
    tlsCAFile: path.join(process.cwd(), 'certs', 'global-bundle.pem'),
    replicaSet: 'rs0',
    readPreference: 'secondaryPreferred',
    retryWrites: false
  } : {})
});

const db = client.db("knowledge_base");

export const docdbStorage = {
  async connect() {
    try {
      await client.connect();
      console.log('Connected to DocumentDB');
      
      // Create indexes for better performance
      await db.collection("documents").createIndex({ "metadata.title": 1 });
      await db.collection("documents").createIndex({ "metadata.type": 1 });
      await db.collection("chats").createIndex({ createdAt: -1 });
      
    } catch (error) {
      console.error('Failed to connect to DocumentDB:', error);
      throw error;
    }
  },

  async createDocument(doc: Document) {
    const result = await db.collection("documents").insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async getDocuments() {
    return db.collection("documents").find().toArray();
  },

  async getDocument(id: string) {
    return db.collection("documents").findOne({ 
      "metadata.id": id 
    });
  },

  async deleteDocument(id: string) {
    await db.collection("documents").deleteOne({ 
      "metadata.id": id 
    });
  },

  async createChat(chat: Chat) {
    const result = await db.collection("chats").insertOne(chat);
    return { ...chat, _id: result.insertedId };
  },

  async getChats() {
    return db.collection("chats")
      .find()
      .sort({ createdAt: -1 })
      .toArray();
  }
}; 