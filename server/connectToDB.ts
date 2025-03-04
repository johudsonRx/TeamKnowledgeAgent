import { MongoClient, MongoClientOptions } from 'mongodb';
import dotenv from 'dotenv';
import fs from 'fs';
import { log } from './vite.js';  // Add this import
dotenv.config();

let client: MongoClient | null = null;

// Debug logging
log(`🔧 Environment Check:
  NODE_ENV: ${process.env.NODE_ENV}
  isProd: ${process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production'}
  MONGODB_URI: ${process.env.MONGODB_URI ? '[CONFIGURED]' : '[NOT SET]'}
  Type of NODE_ENV: ${typeof process.env.NODE_ENV}
`);

const isProd = process.env.NODE_ENV && 
  process.env.NODE_ENV.toLowerCase() === 'production';
const connectionString = isProd 
  ? process.env.MONGODB_URI 
  : 'mongodb://127.0.0.1:27017/knowledge-base';

if (!connectionString) {
  throw new Error('MONGODB_URI is required in production');
}

export async function getMongoClient() {
  if (isProd && !process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not defined in production');
  }

  // Configure options based on environment
  const options: MongoClientOptions = isProd 
    ? {
        tls: true,
        tlsCAFile: '/app/global-bundle.pem',
        retryWrites: false
      }
    : {
        serverSelectionTimeoutMS: 5000,
        family: 4,  // Force IPv4
        directConnection: true  // Connect directly to the server
          // Local development options (if any needed)
      };

  const client = new MongoClient(connectionString!, options);

  try {
    await client.connect();
    console.log(`Connected to MongoDB in ${isProd ? 'production' : 'development'} mode`);
    return client;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
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