import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";

interface Props {
  documentId: string | null;
  highlightedRange?: {
    start: number;
    end: number;
  };
}

export default function DocumentViewer({ documentId, highlightedRange }: Props) {
  const [content, setContent] = useState<string>("");
  
  const { data: document } = useQuery({
    queryKey: ["/api/documents", documentId],
    queryFn: async () => {
      if (!documentId) return null;
      const res = await apiRequest("GET", `/api/documents/${documentId}`);
      return res.json();
    },
    enabled: !!documentId,
  });

  useEffect(() => {
    if (document?.content && highlightedRange) {
      const { start, end } = highlightedRange;
      const beforeHighlight = document.content.slice(0, start);
      const highlighted = document.content.slice(start, end);
      const afterHighlight = document.content.slice(end);
      
      setContent(`${beforeHighlight}<mark class="bg-yellow-200 dark:bg-yellow-800">${highlighted}</mark>${afterHighlight}`);
    } else {
      setContent(document?.content || "");
    }
  }, [document, highlightedRange]);

  if (!documentId) {
    return (
      <div className="p-4 text-muted-foreground">
        No document selected
      </div>
    );
  }

  return (
    <Card className="h-full">
      <ScrollArea className="h-full p-4">
        <h3 className="font-semibold mb-2">{document?.title}</h3>
        <pre 
          className="text-sm whitespace-pre-wrap font-mono"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </ScrollArea>
    </Card>
  );
} 