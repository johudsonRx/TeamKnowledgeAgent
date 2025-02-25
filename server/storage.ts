import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  ScanCommand,
  DeleteCommand,
  QueryCommand 
} from "@aws-sdk/lib-dynamodb";
import type { InsertDocument, InsertChat } from '@shared/schema';
import { MongoClient } from 'mongodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const docClient = DynamoDBDocumentClient.from(client);

export const storage = {
  async createDocument(doc: InsertDocument) {
    const item = {
      ...doc,
      id: Date.now().toString(), // Simple ID generation
      uploadedAt: new Date().toISOString(),
      type: 'DOCUMENT' // To distinguish from chats
    };

    await docClient.send(new PutCommand({
      TableName: "KnowledgeBase",
      Item: item
    }));

    return item;
  },

  async getDocuments() {
    try {
      const client = new MongoClient('mongodb://localhost:27017/knowledge-base');
      await client.connect();
      
      const db = client.db('knowledge-base');
      const collection = db.collection('documents');
      
      const documents = await collection.find({}).toArray();
      
      await client.close();
      return documents;
      
    } catch (error) {
      console.error('Error fetching documents from MongoDB:', error);
      throw error;
    }
  },

  async deleteDocument(id: string) {
    await docClient.send(new DeleteCommand({
      TableName: "KnowledgeBase",
      Key: {
        id,
        type: "DOCUMENT"
      }
    }));
  },

  async createChat(chat: InsertChat) {
    const item = {
      ...chat,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      type: 'CHAT'
    };

    await docClient.send(new PutCommand({
      TableName: "KnowledgeBase",
      Item: item
    }));

    return item;
  },

  async getChats() {
    const response = await docClient.send(new QueryCommand({
      TableName: "KnowledgeBase",
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type"
      },
      ExpressionAttributeValues: {
        ":type": "CHAT"
      }
    }));

    return response.Items || [];
  }
};
