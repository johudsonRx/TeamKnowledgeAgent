export interface DocumentMetadata {
  id: string;
  title: string;
  type: 'PDF' | 'WORD' | 'CODE' | 'EXCEL' | 'TEXT';
  uploadedAt: Date;
  fileSize: number;
  s3Key: string;
  mimeType: string;
}

export interface ProcessedContent {
  textContent: string;
  structure?: any;
  entities?: string[];
  codeLanguage?: string;
  lineCount?: number;
}

export interface Document {
  metadata: DocumentMetadata;
  processed: ProcessedContent;
}

export interface Chat {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
  documentRefs: Array<{ id: string; title: string }>;
} 