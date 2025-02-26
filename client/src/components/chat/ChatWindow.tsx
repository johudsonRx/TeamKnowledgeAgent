import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import MessageList from "./MessageList";
import { type Chat } from "@shared/schema";

export default function ChatWindow() {
  const [question, setQuestion] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      console.log('Sending question:', question);
      const res = await apiRequest("POST", "/api/chat", { question });
      const data = await res.json();
      console.log('Received response:', data);
      return data as Chat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      setQuestion("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit triggered with question:', question);
    
    if (question.trim()) {
      console.log('Attempting to send chat mutation...');
      chatMutation.mutate(question);
      console.log('Chat mutation sent');
    } else {
      console.log('Question was empty or only whitespace');
    }
  };

  console.log()

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-card rounded-lg p-4">
      <MessageList />
      
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          disabled={chatMutation.isPending}
        />
        <Button type="submit" disabled={chatMutation.isPending}>
          Send
        </Button>
      </form>
    </div>
  );
}
