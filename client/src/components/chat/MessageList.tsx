import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Chat } from "@shared/schema";

export default function MessageList() {
  const { data: chats, isLoading } = useQuery<Chat[]>({ 
    queryKey: ["/api/chats"]
  });

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center">Loading...</div>;
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-4 p-4">
        {chats?.map((chat) => (
          <div key={chat.id} className="space-y-2">
            <div className="bg-accent p-3 rounded-lg">
              <p className="font-medium">Q: {chat.question}</p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p>A: {chat.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
