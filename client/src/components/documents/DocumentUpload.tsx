import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { type Document } from "@shared/schema";

const SUPPORTED_EXTENSIONS = [
  'py', 'js', 'ts', 'jsx', 'tsx',
  'go', 'rs', 'java', 'cpp', 'c',
  'yaml', 'yml', 'json', 'sh', 'md',
  'txt'
];

export default function DocumentUpload() {
  const fileInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const content = await file.text();
      
      // Client-side warning
      const warningMessage = `
        Please ensure your document does not contain:
        - Email addresses
        - Phone numbers
        - Social Security numbers
        - Personal addresses
        - Financial information
      `;
      
      if (!window.confirm(warningMessage)) {
        return;
      }
      
      const res = await apiRequest("POST", "/api/documents", {
        title: file.name,
        content,
        vectorId: "temp-" + Date.now(), // In a real app, this would be from embedding
      });
      return res.json() as Promise<Document>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && SUPPORTED_EXTENSIONS.includes(file.name.split('.').pop() || '')) {
      uploadMutation.mutate(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid code file",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-2xl font-semibold">Upload File</h2>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInput}
          type="file"
          accept={SUPPORTED_EXTENSIONS.join(',')}
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          onClick={() => fileInput.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload File"}
        </Button>
      </CardContent>
    </Card>
  );
}
