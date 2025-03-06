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

  return chunks;
} 