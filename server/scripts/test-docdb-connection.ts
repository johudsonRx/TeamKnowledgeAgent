import { docdbStorage } from '../storage/documentdb.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    console.log('Testing DocumentDB connection...');
    
    // Test connection
    await docdbStorage.connect();
    
    // Test basic operations
    console.log('Testing document creation...');
    const testDoc = {
      metadata: {
        id: 'test-' + Date.now(),
        title: 'Test Document',
        type: 'TEXT' as const,
        uploadedAt: new Date(),
        fileSize: 100,
        s3Key: 'test-key',
        mimeType: 'text/plain'
      },
      processed: {
        textContent: 'This is a test document'
      }
    };

    const created = await docdbStorage.createDocument(testDoc);
    console.log('Created document:', created);

    // Test retrieval
    console.log('Testing document retrieval...');
    const docs = await docdbStorage.getDocuments();
    console.log('Retrieved documents:', docs.length);

    // Cleanup
    console.log('Cleaning up test document...');
    await docdbStorage.deleteDocument(testDoc.metadata.id);

    console.log('All tests passed! DocumentDB connection is working.');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Close the connection
    process.exit(0);
  }
}

testConnection(); 