export const AI_CONFIG = {
  provider: 'nvidia-nim',
  baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-super-120b-a12b',
} as const;

export function assertAIConfiguration() {
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured on the server');
  }
  return AI_CONFIG;
}
