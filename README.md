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
- Local mongo db instance, document db instance on AWS in higher environments

## Adding Documents
1. Navigate to the home page
2. Click "Upload Text File"
3. Select a .txt file to upload
4. The document will be processed and added to the knowledge base

## Asking Questions
1. Go to the Chat page
2. Type your question
3. The AI will respond using the context from your uploaded documents

# Chat Application

## Deployment Steps

### 1. Build and Test Docker Image Locally
bash

Build the Docker image
docker build -t chat-api .
Test locally with docker-compose
docker-compose up

### 2. Create ECR Repository

bash
Create a new ECR repository
aws ecr create-repository --repository-name chat-api

### 3. Push to ECR

bash
Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${ECR_URI}
Tag the image
docker tag chat-api:latest ${ECR_URI}/chat-api:latest
Push to ECR
docker push ${ECR_URI}/chat-api:latest

### 4. Create ECS Cluster

bash
Create a new ECS cluster
aws ecs create-cluster --cluster-name chat-cluster

### 5. Register Task Definition

bash
Register the ECS task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

### 6. Create ECS Service

bash
Create the ECS service
aws ecs create-service \
--cluster chat-cluster \
--service-name chat-api \
--task-definition chat-api \
--desired-count 1 \
--launch-type FARGATE \
--network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx]}"

### Environment Variables Required
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `MONGODB_URI`
- `BEDROCK_MODEL_ID` (optional)

### Prerequisites
- AWS CLI configured with appropriate credentials
- Docker installed locally
- Access to AWS ECR, ECS, and Bedrock services
- MongoDB connection string

### Important Notes
- Replace `${ECR_URI}` with your actual ECR repository URI
- Update subnet and security group IDs in the create-service command
- Ensure IAM roles and policies are properly configured
- Make sure MongoDB is accessible from the ECS task network

==================================================================================

## TODO:
1. Add more customization to agent prompts
2. Move route.ts logic to modular controller and helper file structure
3. Add support for other file/document formats
4. Configure a deployment with AWS native services
5. Add a threads section to the chat UI (more of a future enhancement)
6. Bring up a reference list section for documents similar to how perplexity does when you prmopt it and it returns videos and links that back up its answers (more of a future enhancement)
7. Consider having support for multiple LLMs based on the document type. For example: You want context on a code file -> switch to a model like claude 3.7 for explaining code. 
8. Decide how to make the document search more contextualized. A few options to consider:
    -Add vector embeddings for semantic search
    -Only include relevant documents in the context
    -Use a chunking strategy for large documents
    -Add metadata for better context
