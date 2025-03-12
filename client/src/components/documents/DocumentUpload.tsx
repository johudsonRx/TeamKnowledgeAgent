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
  'txt', 'pptx', 'ppt'
];

export default function DocumentUpload() {
  const fileInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      let content;
      const fileType = file.name.split('.').pop()?.toLowerCase() || '';
      
      // Handle binary files differently
      if (['pptx', 'ppt', 'pdf'].includes(fileType)) {
        // For binary files, we'll use FormData to upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        formData.append('type', fileType.toUpperCase());
        
        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData
        });
        
        return res.json() as Promise<Document>;
      } else {
        // For text files, continue with the existing approach
        content = await file.text();
        
        const res = await apiRequest("POST", "/api/documents", {
          title: file.name,
          content,
          vectorId: "temp-" + Date.now(),
          type: fileType.toUpperCase()
        });
        
        return res.json() as Promise<Document>;
      }
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
