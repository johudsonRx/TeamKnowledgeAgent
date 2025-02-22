import { Link } from "wouter";
import DocumentUpload from "@/components/documents/DocumentUpload";
import DocumentList from "@/components/documents/DocumentList";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Document Management</h1>
          <Link href="/chat">
            <a className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
              Go to Chat
            </a>
          </Link>
        </div>

        <div className="grid gap-8">
          <DocumentUpload />
          <DocumentList />
        </div>
      </div>
    </div>
  );
}
