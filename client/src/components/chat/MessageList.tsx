import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Chat } from "@shared/schema";

export default function MessageList() {
  const { data: chats, isLoading, error } = useQuery({
    queryKey: ["/api/chats"],
    queryFn: async () => {
      debugger;
      const res = await apiRequest("GET", "/api/chats");
      const data = await res.json();
      console.log('Chat data:', data);
      return data as Chat[];
    },
  });

  if (isLoading) {
    return <div className="flex-1 p-4">Loading chats...</div>;
  }

  if (error) {
    return <div className="flex-1 p-4 text-red-500">Error loading chats: {error.message}</div>;
  }

  if (!chats?.length) {
    return <div className="flex-1 p-4 text-muted-foreground">No messages yet</div>;
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      {chats.map((chat) => (
        <div key={chat.id} className="space-y-2">
          <div className="font-medium">
            Q: {chat.question}
          </div>
          <div className="pl-4">
            A: {chat.answer || 'Waiting for response...'}
          </div>
        </div>
      ))}
    </div>
  );
}
