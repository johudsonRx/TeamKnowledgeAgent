import { log } from '../vite.js';
import { extractTextFromPPTX } from './pptxProcessor.js';

interface ProcessedDocument {
  textContent: string;
  structure?: any;
  entities?: string[];
  codeLanguage?: string;
  lineCount?: number;
}

export async function processDocument(content: string | Buffer, type: string): Promise<ProcessedDocument> {
  try {
    // Basic processing for now, can be expanded based on document type
    switch (type.toUpperCase()) {
      case 'PDF':
        return processPDF(content as string);
      case 'CODE':
        return processCode(content as string);
      case 'TEXT':
        return processText(content as string);
      case 'PPTX':
        return processPowerPoint(content as Buffer);
      default:
        return {
          textContent: content as string
        };
    }
  } catch (error) {
    log(`❌ Error in document processing: ${error instanceof Error ? error.message : String(error)}`);
    return {
      textContent: `Error processing document: ${error instanceof Error ? error.message : String(error)}`,
      structure: { error: true }
    };
  }
}

function processText(content: string): ProcessedDocument {
  return {
    textContent: content,
    structure: {
      paragraphs: content.split('\n\n').length,
      characters: content.length
    }
  };
}

function processCode(content: string): ProcessedDocument {
  const lines = content.split('\n');
  const languageHint = lines[0].includes('```') ? lines[0].replace('```', '') : 'unknown';
  
  return {
    textContent: content,
    codeLanguage: languageHint,
    lineCount: lines.length,
    structure: {
      lines: lines.length,
      characters: content.length
    }
  };
}

function processPDF(content: string): ProcessedDocument {
  // Basic text processing for now
  // TODO: Add actual PDF processing logic
  return {
    textContent: content,
    structure: {
      paragraphs: content.split('\n\n').length,
      characters: content.length
    }
  };
}

async function processPowerPoint(buffer: Buffer): Promise<ProcessedDocument> {
  try {
    // Extract text from PowerPoint
    const extractedText = await extractTextFromPPTX(buffer);
    
    // Process slides
    const slides = extractedText.slides.map((slide, index) => {
      return `Slide ${index + 1}: ${slide.title}\n${slide.content}`;
    });
    
    return {
      textContent: slides.join('\n\n'),
      structure: {
        slideCount: slides.length,
        hasNotes: extractedText.hasNotes
      }
    };
  } catch (error) {
    log(`❌ PowerPoint processing error: ${error instanceof Error ? error.message : String(error)}`);
    throw error; // Let the main processDocument function handle the error
  }
} 