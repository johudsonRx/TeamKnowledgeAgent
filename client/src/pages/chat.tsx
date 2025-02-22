import { Link } from "wouter";
import ChatWindow from "@/components/chat/ChatWindow";

export default function Chat() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">AI Chat</h1>
          <Link href="/">
            <a className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
              Manage Documents
            </a>
          </Link>
        </div>

        <ChatWindow />
      </div>
    </div>
  );
}
