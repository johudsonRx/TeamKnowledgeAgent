import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/knowledge-base';
let client: MongoClient | null = null;

export async function getMongoClient() {
  if (!client) {
    try {
      client = new MongoClient(connectionString, {
        serverSelectionTimeoutMS: 5000,
        family: 4,  // Force IPv4
        directConnection: true  // Connect directly to the server
      });
      await client.connect();
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }
  return client;
}

export async function getDB() {
  const client = await getMongoClient();
  return client.db('knowledge-base');
}

export async function closeConnection() {
  if (client) {
    await client.close();
    client = null;
  }
}

// Handle application shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

export async function getDocuments() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MongoDB connection string is not defined');
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI);
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
} 