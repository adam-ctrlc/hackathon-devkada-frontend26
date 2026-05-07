import { apiRequest } from "./api.js";
import { GoogleGenAI } from "@google/genai";

const defaultModel = "gemini-3.1-flash-live-preview";

const safeTrim = (value) => String(value ?? "").trim();

const extractFirstJsonValue = (text) => {
  const source = safeTrim(text);
  if (!source) return "";

  const openingIndex = source.search(/[{\[]/);
  if (openingIndex === -1) return source;

  const stack = [];
  let inString = false;
  let isEscaped = false;

  for (let index = openingIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === '"') inString = false;
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const last = stack.at(-1);
      const matches =
        (char === "}" && last === "{") || (char === "]" && last === "[");
      if (!matches) break;

      stack.pop();
      if (stack.length === 0) return source.slice(openingIndex, index + 1);
    }
  }

  return source;
};

const parseJsonText = (text) => {
  const value = extractFirstJsonValue(text);
  if (!value) {
    throw new Error("Gemini Live returned an empty response");
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(
      `Gemini Live response was not valid JSON: ${value.slice(0, 500)}`,
    );
  }
};

const describeSocketEvent = (event, fallback) => {
  if (!event) {
    return fallback;
  }

  if (typeof event === "string") {
    return event;
  }

  const pieces = [
    event.message,
    event.reason,
    event.code ? `code ${event.code}` : "",
    event.type,
  ].filter(Boolean);

  return pieces.length ? pieces.join(" · ") : fallback;
};

export const runGeminiLiveJson = async ({
  prompt,
  model = defaultModel,
  temperature = 0.4,
  timeoutMs = 180000,
  onProgress,
}) => {
  const tokenPayload = await apiRequest("/gemini-token", {
    method: "POST",
    body: {
      model,
      config: { temperature },
    },
    timeoutMs: 30000,
  });

  const token = tokenPayload?.token;
  if (!token) {
    throw new Error("Gemini token response did not include a token");
  }

  const resolvedModel = tokenPayload.model || model;
  const systemInstruction =
    tokenPayload.systemInstruction ??
    "Return exactly one valid JSON value. No markdown, no code fences, no prose.";
  const textChunks = [];
  let session;
  let setupComplete = false;

  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      session?.close();
      reject(
        new Error(
          `Gemini Live timed out. Received text: ${textChunks
            .join("")
            .slice(0, 500)}`,
        ),
      );
    }, timeoutMs);

    const finish = (callback) => {
      clearTimeout(timeoutId);
      session?.close();
      callback();
    };

    const sendPrompt = () => {
      if (!session) return;

      onProgress?.("Prompt sent. Waiting for Gemini Live response...");
      const jsonPrompt = [
        systemInstruction,
        "User request:",
        prompt,
        "Return JSON only.",
      ]
        .filter(Boolean)
        .join("\n\n");
      session.sendRealtimeInput({ text: jsonPrompt });
    };

    const ai = new GoogleGenAI({
      apiKey: token,
      httpOptions: { apiVersion: "v1alpha" },
    });

    ai.live
      .connect({
        model: resolvedModel,
        config: {
          responseModalities: ["AUDIO"],
          temperature,
          maxOutputTokens: 12000,
          outputAudioTranscription: {},
          systemInstruction,
        },
        callbacks: {
          onopen: () => onProgress?.("Gemini Live socket opened..."),
          onmessage: (message) => {
            console.log("Gemini Live message", message);

            if (message.setupComplete) {
              setupComplete = true;
              onProgress?.("Gemini Live setup complete...");
              sendPrompt();
              return;
            }

            if (message.serverContent?.outputTranscription?.text) {
              textChunks.push(message.serverContent.outputTranscription.text);
              onProgress?.(
                `Receiving Gemini text (${textChunks.join("").length} chars)...`,
              );
            }

            const parts = message.serverContent?.modelTurn?.parts ?? [];
            for (const part of parts) {
              if (part.text) {
                textChunks.push(part.text);
                onProgress?.(
                  `Receiving Gemini text (${textChunks.join("").length} chars)...`,
                );
              }
            }

            if (message.serverContent?.turnComplete) {
              finish(() => resolve(parseJsonText(textChunks.join("").trim())));
            }
          },
          onerror: (event) => {
            console.error("Gemini Live error", event);
            finish(() =>
              reject(
                new Error(
                  describeSocketEvent(event, "Gemini Live socket failed"),
                ),
              ),
            );
          },
          onclose: (event) => {
            console.log("Gemini Live close", event?.code, event?.reason, event);
            if (!event.wasClean && textChunks.length === 0) {
              finish(() =>
                reject(
                  new Error(
                    `Gemini Live socket closed before text arrived: ${
                      event.reason || event.code
                    }`,
                  ),
                ),
              );
            }
          },
        },
      })
      .then((connectedSession) => {
        session = connectedSession;
        if (setupComplete) sendPrompt();
      })
      .catch((error) => finish(() => reject(error)));
  });
};
