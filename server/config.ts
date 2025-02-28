export const config = {
  port: process.env.PORT || 6000,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/knowledge-base',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    bedrock: {
      modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-v2'
    }
  }
}; 