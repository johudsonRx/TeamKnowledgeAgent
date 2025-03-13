import { Pool } from 'pg';
import dotenv from 'dotenv';
import { log } from './vite.js';
dotenv.config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/knowledge_base',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// Log connection info
log(`🔧 Environment Check:
  NODE_ENV: ${process.env.NODE_ENV}
  isProd: ${process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'production'}
  DATABASE_URL: ${process.env.DATABASE_URL ? '[CONFIGURED]' : '[NOT SET]'}
`);

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    log('❌ Database connection error:', err);
  } else {
    log(`✅ Connected to PostgreSQL at ${res.rows[0].now}`);
  }
});

export async function getDB() {
  return pool;
}

export async function closeConnection() {
  await pool.end();
}

// Handle application shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

// Initialize database tables
export async function initDB() {
  try {
    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        vector_id TEXT NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create document_chunks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        embedding JSONB NOT NULL,
        metadata JSONB NOT NULL,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE
      )
    `);

    // Create chats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        context JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    log('✅ Database tables initialized');
  } catch (error) {
    log('❌ Error initializing database:', error);
    throw error;
  }
} 