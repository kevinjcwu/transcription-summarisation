const REQUIRED_ENV = [
  "SPEECH_REGION",
  "SPEECH_RESOURCE_ENDPOINT",
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_DEPLOYMENT",
  "AZURE_OPENAI_API_VERSION",
] as const;

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error("Missing required environment variables:", missing.join(", "));
  console.error("Copy .env.example to .env and fill in the values.");
  process.exit(1);
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  speech: {
    region: requireEnv("SPEECH_REGION"),
    resourceEndpoint: requireEnv("SPEECH_RESOURCE_ENDPOINT"),
    language: process.env.SPEECH_LANGUAGE || "en-US",
  },
  openai: {
    endpoint: requireEnv("AZURE_OPENAI_ENDPOINT"),
    deployment: requireEnv("AZURE_OPENAI_DEPLOYMENT"),
    apiVersion: requireEnv("AZURE_OPENAI_API_VERSION"),
  },
  tokenRefreshIntervalMs: 8 * 60 * 1000,
  audioFormat: {
    sampleRate: 16000,
    bitsPerSample: 16,
    channels: 1,
  },
} as const;
