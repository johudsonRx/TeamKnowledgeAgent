import { log } from '../vite.js';

interface Chunk {
  content: string;
  metadata: {
    documentId: string;
    startIndex: number;
    endIndex: number;
    title: string;
    fileType?: string;
  }
}

export function chunkDocument(
  content: string, 
  documentId: string,
  title: string,
  maxChunkSize = 1000,
  overlap = 100
): Chunk[] {
  // Add debug logging
  log(`Chunking document: ${title}`);
  log(`Content length: ${content.length}`);

  // Check for special characters or encoding issues
  if (content.includes('\ufffd')) {
    log('⚠️ Document contains invalid UTF-8 characters');
  }

  const chunks: Chunk[] = [];
  const fileType = title.split('.').pop() || '';
  
  // For code files, try to chunk by function/class boundaries
  if (['js', 'ts', 'py', 'java', 'cpp'].includes(fileType)) {
    // Split on common code boundaries
    const boundaries = content.split(/\n\s*(function|class|const|let|var|def|public|private)\s/);
    let currentChunk = '';
    let startIndex = 0;

    for (const boundary of boundaries) {
      if ((currentChunk + boundary).length > maxChunkSize && currentChunk) {
        chunks.push({
          content: currentChunk,
          metadata: {
            documentId,
            startIndex,
            endIndex: startIndex + currentChunk.length,
            title,
            fileType
          }
        });
        startIndex += currentChunk.length - overlap;
        currentChunk = boundary;
      } else {
        currentChunk += boundary;
      }
    }

    // Add the final chunk if there's remaining content
    if (currentChunk) {
      chunks.push({
        content: currentChunk,
        metadata: {
          documentId,
          startIndex,
          endIndex: startIndex + currentChunk.length,
          title,
          fileType
        }
      });
    }
  } else if (['pptx', 'ppt'].includes(fileType)) {
    // Split by slides (already marked in the text)
    const slides = content.split(/Slide \d+:/);
    
    for (const slide of slides) {
      if (!slide.trim()) continue;
      
      chunks.push({
        content: slide,
        metadata: {
          documentId,
          startIndex: content.indexOf(slide),
          endIndex: content.indexOf(slide) + slide.length,
          title,
          fileType
        }
      });
    }
  } else {
    // For text files, chunk by paragraphs or sentences
    let currentPosition = 0;
    
    while (currentPosition < content.length) {
      const chunk = content.slice(
        currentPosition, 
        currentPosition + maxChunkSize
      );
      
      chunks.push({
        content: chunk,
        metadata: {
          documentId,
          startIndex: currentPosition,
          endIndex: currentPosition + chunk.length,
          title,
          fileType
        }
      });
      
      currentPosition += maxChunkSize - overlap;
    }
  }

  // If no chunks were created (file too small), create a single chunk
  if (chunks.length === 0) {
    chunks.push({
      content: content,
      metadata: {
        documentId,
        startIndex: 0,
        endIndex: content.length,
        title,
        fileType
      }
    });
  }

  log(`Created ${chunks.length} chunks for ${title}`);
  return chunks;
} 