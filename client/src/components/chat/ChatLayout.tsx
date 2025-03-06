import { useState } from "react";
import ChatWindow from "./ChatWindow";
import DocumentViewer from "./DocumentViewer";

interface HighlightRange {
  documentId: string;
  start: number;
  end: number;
}

export default function ChatLayout() {
  const [activeDocument, setActiveDocument] = useState<string | null>(null);
  const [highlightedRange, setHighlightedRange] = useState<HighlightRange | null>(null);

  const handleDocumentReference = (docId: string, start?: number, end?: number) => {
    setActiveDocument(docId);
    if (start !== undefined && end !== undefined) {
      setHighlightedRange({ documentId: docId, start, end });
    }
  };

  return (
    <div className="flex h-screen">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatWindow onDocumentReference={handleDocumentReference} />
      </div>

      {/* Right Sidebar - Document Viewer */}
      <div className="w-1/3 border-l border-border bg-muted/30">
        <DocumentViewer 
          documentId={activeDocument}
          highlightedRange={
            highlightedRange?.documentId === activeDocument 
              ? { start: highlightedRange.start, end: highlightedRange.end }
              : undefined
          }
        />
      </div>
    </div>
  );
} 