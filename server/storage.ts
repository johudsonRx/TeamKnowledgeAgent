import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  ScanCommand,
  DeleteCommand,
  QueryCommand 
} from "@aws-sdk/lib-dynamodb";
import type { InsertDocument, InsertChat } from '../shared/schema.js';

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
    const response = await docClient.send(new QueryCommand({
      TableName: "KnowledgeBase",
      KeyConditionExpression: "#type = :type",
      ExpressionAttributeNames: {
        "#type": "type"
      },
      ExpressionAttributeValues: {
        ":type": "DOCUMENT"
      }
    }));

    return response.Items || [];
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
