import { ComprehendClient, DetectPiiEntitiesCommand } from "@aws-sdk/client-comprehend";

const comprehend = new ComprehendClient({ region: process.env.AWS_REGION });

const PII_PATTERNS = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  SSN: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,
  PHONE: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
  // Add more patterns as needed
};

export async function detectPII(text: string) {
  // Check with regex patterns
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(text)) {
      throw new Error(`Detected ${type} in document. Please remove before uploading.`);
    }
  }

  // Double-check with AWS Comprehend
  const command = new DetectPiiEntitiesCommand({
    Text: text,
    LanguageCode: 'en'
  });
  
  const { Entities } = await comprehend.send(command);
  if (Entities && Entities.length > 0) {
    throw new Error('Detected sensitive information in document. Please review and remove before uploading.');
  }
} 