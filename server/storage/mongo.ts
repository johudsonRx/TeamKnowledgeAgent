import { MongoClient, ObjectId } from "mongodb";
import type { Document, Chat } from "./types";

const client = new MongoClient(process.env.MONGODB_URI!);
const db = client.db("knowledge_base");

export const mongoStorage = {
  async connect() {
    await client.connect();
  },

  async createDocument(doc: Document) {
    const result = await db.collection("documents").insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async getDocuments() {
    return db.collection("documents").find().toArray();
  },

  async getDocument(id: string) {
    return db.collection("documents").findOne({ _id: new ObjectId(id) });
  },

  async deleteDocument(id: string) {
    await db.collection("documents").deleteOne({ _id: new ObjectId(id) });
  },

  async createChat(chat: Chat) {
    const result = await db.collection("chats").insertOne(chat);
    return { ...chat, _id: result.insertedId };
  },

  async getChats() {
    return db.collection("chats").find().toArray();
  }
}; 