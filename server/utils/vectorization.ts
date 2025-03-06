import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { log } from '../vite.js';

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1"
});

export interface VectorizedChunk {
  content: string;
  embedding: number[];
  metadata: {
    documentId: string;
    startIndex: number;
    endIndex: number;
    title: string;
    fileType?: string;
  }
  embeddingLength: number;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const params = {
    modelId: "amazon.titan-embed-text-v1",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      inputText: text
    })
  };

  const response = await bedrock.send(new InvokeModelCommand(params));
  const embedding = JSON.parse(new TextDecoder().decode(response.body)).embedding;
  return embedding;
}

export async function vectorizeChunks(chunks: any[]): Promise<VectorizedChunk[]> {
  log(`🔢 Vectorizing ${chunks.length} chunks...`);
  const vectorizedChunks: VectorizedChunk[] = [];

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content);
    vectorizedChunks.push({
      ...chunk,
      embedding,
      embeddingLength: embedding.length
    });
  }

  log(`✅ Vectorization complete. Sample embedding length: ${vectorizedChunks[0]?.embeddingLength}`);
  return vectorizedChunks;
}

// Cosine similarity for vector search
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}

// Add a function to test similarity scores
export function testSimilarity(questionEmbedding: number[], chunks: VectorizedChunk[]) {
  return chunks.map(chunk => ({
    content: chunk.content.slice(0, 50) + '...', // Preview
    similarity: cosineSimilarity(questionEmbedding, chunk.embedding),
    metadata: chunk.metadata
  }));
} 