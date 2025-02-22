import { 
  type Document, type InsertDocument,
  type Chat, type InsertChat 
} from "@shared/schema";

export interface IStorage {
  // Document operations
  createDocument(doc: InsertDocument): Promise<Document>;
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<void>;
  
  // Chat operations
  createChat(chat: InsertChat): Promise<Chat>;
  getChats(): Promise<Chat[]>;
}

export class MemStorage implements IStorage {
  private documents: Map<number, Document>;
  private chats: Map<number, Chat>;
  private documentId: number;
  private chatId: number;

  constructor() {
    this.documents = new Map();
    this.chats = new Map();
    this.documentId = 1;
    this.chatId = 1;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const id = this.documentId++;
    const document: Document = {
      id,
      uploadedAt: new Date(),
      ...doc,
    };
    this.documents.set(id, document);
    return document;
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async deleteDocument(id: number): Promise<void> {
    this.documents.delete(id);
  }

  async createChat(chat: InsertChat): Promise<Chat> {
    const id = this.chatId++;
    const chatEntry: Chat = {
      id,
      createdAt: new Date(),
      ...chat,
    };
    this.chats.set(id, chatEntry);
    return chatEntry;
  }

  async getChats(): Promise<Chat[]> {
    return Array.from(this.chats.values());
  }
}

export const storage = new MemStorage();
