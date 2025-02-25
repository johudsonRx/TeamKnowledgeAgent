import { s3Storage } from "./s3";
import { mongoStorage } from "./mongo";
import type { InsertDocument, InsertChat } from "@shared/schema";
import { processDocument } from "../utils/documentProcessor";

export const storage = {
  async initialize() {
    await mongoStorage.connect();
  },

  async createDocument(doc: InsertDocument) {
    // Generate S3 key
    const s3Key = `documents/${Date.now()}-${doc.title}`;

    // Upload to S3
    await s3Storage.uploadFile(s3Key, Buffer.from(doc.content), doc.mimeType);

    // Process document content
    const processed = await processDocument(doc.content, doc.type);

    // Create document metadata
    const document = {
      metadata: {
        id: Date.now().toString(),
        title: doc.title,
        type: doc.type,
        uploadedAt: new Date(),
        fileSize: Buffer.from(doc.content).length,
        s3Key,
        mimeType: doc.mimeType
      },
      processed
    };

    // Store in MongoDB
    return mongoStorage.createDocument(document);
  },

  async getDocuments() {
    return mongoStorage.getDocuments();
  },

  async deleteDocument(id: string) {
    const doc = await mongoStorage.getDocument(id);
    if (doc) {
      await s3Storage.deleteFile(doc.metadata.s3Key);
      await mongoStorage.deleteDocument(id);
    }
  },

  async createChat(chat: InsertChat) {
    const chatDoc = {
      ...chat,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    return mongoStorage.createChat(chatDoc);
  },

  async getChats() {
    return mongoStorage.getChats();
  }
}; 