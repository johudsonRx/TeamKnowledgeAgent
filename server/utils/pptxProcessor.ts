import { log } from '../vite.js';
import PptxGenJS from 'pptxgenjs';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface Slide {
  title: string;
  content: string;
}

interface PPTXExtractResult {
  slides: Slide[];
  hasNotes: boolean;
}

/**
 * Extracts text content from a PowerPoint file
 * @param buffer The PowerPoint file as a Buffer
 * @returns Extracted text content organized by slides
 */
export async function extractTextFromPPTX(buffer: Buffer): Promise<PPTXExtractResult> {
  try {
    log('📊 Processing PowerPoint file...');
    
    // Create a temporary file to save the buffer
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pptx-'));
    const tempFile = path.join(tempDir, 'presentation.pptx');
    
    await fs.writeFile(tempFile, buffer);
    
    // Use PptxGenJS to read the file
    const pptx = new PptxGenJS();
    const presentation = await pptx.load(tempFile);
    
    const slides: Slide[] = [];
    let hasNotes = false;
    
    // Process each slide
    presentation.slides.forEach((slide, index) => {
      // Extract text from shapes
      const textElements = slide.shapes
        .filter(shape => shape.text)
        .map(shape => shape.text);
      
      // Determine title (first text element or default)
      const title = textElements.length > 0 ? textElements[0] : `Slide ${index + 1}`;
      
      // Combine remaining text as content
      const content = textElements.slice(1).join('\n');
      
      // Check for notes
      if (slide.notes) {
        hasNotes = true;
      }
      
      slides.push({
        title,
        content
      });
    });
    
    // Clean up temp file
    await fs.rm(tempDir, { recursive: true, force: true });
    
    log(`✅ Extracted ${slides.length} slides from PowerPoint`);
    return { slides, hasNotes };
    
  } catch (error) {
    log(`❌ Error processing PowerPoint: ${error instanceof Error ? error.message : String(error)}`);
    
    // Return a fallback result with error information
    return {
      slides: [{
        title: 'Error Processing PowerPoint',
        content: `Failed to extract content: ${error instanceof Error ? error.message : String(error)}`
      }],
      hasNotes: false
    };
  }
} 