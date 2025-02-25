# Team Document Q&A Agent

A RAG-based AI agent using Node.js, React, and Amazon Bedrock for team document Q&A.

## Features
- Document upload and management
- AI-powered document Q&A using Amazon Bedrock
- Real-time chat interface
- Support for text files (expandable to other formats)

## Prerequisites
- Node.js v20 or later
- AWS Account with Bedrock access
- AWS credentials with the following permissions:
  - `bedrock:InvokeModel`
  - `bedrock:ListFoundationModels`

## Setup

1. Clone or download the project
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Running the Project

1. Start the development server:
```bash
npm run dev
```

2. Open your browser to `http://localhost:5000`

## Project Structure
- `/client` - React frontend
- `/server` - Express backend
- `/shared` - Shared types and schemas

## Development

### Frontend
The frontend is built with:
- React
- TanStack Query for data fetching
- Shadcn UI components
- Tailwind CSS for styling

### Backend
The backend uses:
- Express.js
- Amazon Bedrock for AI/ML
- In-memory storage (can be extended to use a database)

## Adding Documents
1. Navigate to the home page
2. Click "Upload Text File"
3. Select a .txt file to upload
4. The document will be processed and added to the knowledge base

## Asking Questions
1. Go to the Chat page
2. Type your question
3. The AI will respond using the context from your uploaded documents
