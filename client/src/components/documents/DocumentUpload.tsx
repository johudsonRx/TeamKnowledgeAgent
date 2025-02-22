import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { type Document } from "@shared/schema";

export default function DocumentUpload() {
  const fileInput = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const content = await file.text();
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
    if (file && file.type === "text/plain") {
      uploadMutation.mutate(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid text file",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-2xl font-semibold">Upload Document</h2>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInput}
          type="file"
          accept=".txt"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          onClick={() => fileInput.current?.click()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? "Uploading..." : "Upload Text File"}
        </Button>
      </CardContent>
    </Card>
  );
}
