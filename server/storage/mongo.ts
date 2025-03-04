import { ObjectId } from "mongodb";
import type { Document, Chat } from "./types.js";
import { getDB } from "../connectToDB.js";

export const mongoStorage = {
  async createDocument(doc: Document) {
    const db = await getDB();
    const result = await db.collection("documents").insertOne(doc);
    return { ...doc, _id: result.insertedId };
  },

  async getDocuments() {
    const db = await getDB();
    return db.collection("documents").find().toArray();
  },

  async getDocument(id: string) {
    const db = await getDB();
    return db.collection("documents").findOne({ _id: new ObjectId(id) });
  },

  async deleteDocument(id: string) {
    const db = await getDB();
    await db.collection("documents").deleteOne({ _id: new ObjectId(id) });
  },

  async createChat(chat: Chat) {
    const db = await getDB();
    const result = await db.collection("chats").insertOne(chat);
    return { ...chat, _id: result.insertedId };
  },

  async getChats() {
    const db = await getDB();
    return db.collection("chats").find().toArray();
  }
}; 