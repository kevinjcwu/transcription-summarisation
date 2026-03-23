import "dotenv/config";

import express, { Request, Response } from "express";
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from "@azure/identity";
import { AzureOpenAI } from "openai";
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./config";
import { SYSTEM_PROMPT } from "./prompts";

// ── Shared constants ───────────────────────────────────────────────────
const COGNITIVE_SERVICES_SCOPE = "https://cognitiveservices.azure.com/.default";
const WS_MESSAGE_STOP = "STOP";

// Derive the custom domain hostname from the resource endpoint
const speechCustomDomain = new URL(config.speech.resourceEndpoint).hostname;

// ── Express app ────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

const credential = new DefaultAzureCredential();

// ── Azure OpenAI ───────────────────────────────────────────────────────
const tokenProvider = getBearerTokenProvider(
  credential,
  COGNITIVE_SERVICES_SCOPE
);

const openai = new AzureOpenAI({
  azureADTokenProvider: tokenProvider,
  endpoint: config.openai.endpoint,
  apiVersion: config.openai.apiVersion,
  deployment: config.openai.deployment,
});

interface MeetingNotes {
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
}

interface SummarizeRequest {
  chunk: string;
  previousNotes: MeetingNotes | null;
}

app.post("/api/summarize", async (req: Request, res: Response) => {
  try {
    const { chunk, previousNotes } = req.body as SummarizeRequest;

    const userMessage = previousNotes
      ? `Previous notes:\n${JSON.stringify(previousNotes)}\n\nNew transcript chunk:\n${chunk}`
      : `Transcript chunk:\n${chunk}`;

    const completion = await openai.chat.completions.create({
      model: config.openai.deployment,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = completion.choices[0].message.content?.trim();
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const notes: MeetingNotes = JSON.parse(content);
    res.json(notes);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Summarize error:", message);
    res.status(500).json({ error: message });
  }
});

// ── Speech recognition helpers ─────────────────────────────────────────

function buildSpeechEndpoint(): URL {
  // When disableLocalAuth=true with a custom domain, the Speech SDK can't follow
  // the 301 redirect from the custom domain. We connect directly to the regional
  // endpoint and pass the custom domain name as a query parameter for auth routing.
  const endpoint = new URL(
    `wss://${config.speech.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`
  );
  endpoint.searchParams.set("language", config.speech.language);
  endpoint.searchParams.set("Ocp-Apim-Custom-Domain-Name", speechCustomDomain);
  return endpoint;
}

interface SpeechResources {
  recognizer: sdk.SpeechRecognizer;
  pushStream: sdk.PushAudioInputStream;
}

function createSpeechRecognizer(authToken: string): SpeechResources {
  const speechConfig = sdk.SpeechConfig.fromEndpoint(buildSpeechEndpoint());
  speechConfig.authorizationToken = authToken;

  const { sampleRate, bitsPerSample, channels } = config.audioFormat;
  const pushStream = sdk.AudioInputStream.createPushStream(
    sdk.AudioStreamFormat.getWaveFormatPCM(sampleRate, bitsPerSample, channels)
  );
  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream);
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  return { recognizer, pushStream };
}

interface WsMessage {
  type: "ready" | "recognizing" | "recognized" | "error";
  text?: string;
  error?: string;
}

function sendToClient(ws: WebSocket, message: WsMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// ── WebSocket server ───────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/speech" });

wss.on("connection", async (ws: WebSocket) => {
  console.log("Client connected for speech recognition");

  let tokenInterval: ReturnType<typeof setInterval> | null = null;

  try {
    const tokenResponse = await credential.getToken(COGNITIVE_SERVICES_SCOPE);
    const { recognizer, pushStream } = createSpeechRecognizer(
      tokenResponse.token
    );

    recognizer.sessionStarted = (_s, e) => {
      console.log("Speech session started:", e.sessionId);
    };

    recognizer.recognizing = (_s, e) => {
      console.log("Recognizing:", e.result.text);
      sendToClient(ws, { type: "recognizing", text: e.result.text });
    };

    recognizer.recognized = (_s, e) => {
      if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
        console.log("Recognized:", e.result.text);
        sendToClient(ws, { type: "recognized", text: e.result.text });
      }
    };

    recognizer.canceled = (_s, e) => {
      console.log(
        "Speech canceled:",
        sdk.CancellationReason[e.reason],
        e.errorDetails || ""
      );
      if (e.reason === sdk.CancellationReason.Error) {
        sendToClient(ws, {
          type: "error",
          error: e.errorDetails || "Recognition canceled",
        });
      }
    };

    recognizer.startContinuousRecognitionAsync(
      () => {
        console.log("✅ Speech recognition started (Azure Speech SDK)");
        sendToClient(ws, { type: "ready" });
      },
      (err) => {
        console.error("❌ Speech start error:", err);
        sendToClient(ws, { type: "error", error: String(err) });
      }
    );

    ws.on("message", (data: Buffer | string) => {
      if (Buffer.isBuffer(data)) {
        pushStream.write(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
      } else if (data.toString() === WS_MESSAGE_STOP) {
        pushStream.close();
        recognizer.stopContinuousRecognitionAsync(
          () => recognizer.close(),
          (err) => console.error("Stop error:", err)
        );
      }
    });

    // Token refresh
    tokenInterval = setInterval(async () => {
      try {
        const newToken = await credential.getToken(COGNITIVE_SERVICES_SCOPE);
        recognizer.authorizationToken = newToken.token;
        console.log("Token refreshed");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("Token refresh failed:", msg);
      }
    }, config.tokenRefreshIntervalMs);

    ws.on("close", () => {
      console.log("Client disconnected");
      if (tokenInterval) clearInterval(tokenInterval);
      try {
        pushStream.close();
      } catch (_) {}
      recognizer.stopContinuousRecognitionAsync(
        () => {
          try {
            recognizer.close();
          } catch (_) {}
        },
        () => {}
      );
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Speech setup error:", message);
    sendToClient(ws, { type: "error", error: message });
    if (tokenInterval) clearInterval(tokenInterval);
    ws.close();
  }
});

server.listen(config.port, () => {
  console.log(`Meeting spike running at http://localhost:${config.port}`);
});
