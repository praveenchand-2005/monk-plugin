import OpenAI from 'openai';

let client: OpenAI | undefined;

export function getAIClient() {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not configured on the server');
  }

  client ??= new OpenAI({
    apiKey,
    baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  });

  return client;
}
