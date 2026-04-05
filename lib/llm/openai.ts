type GenerateLlmTextOptions = {
  systemPrompt: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type LlmProvider = "openai" | "anthropic";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

function getApiKey() {
  return process.env.SUMMARIZER_API_KEY?.trim() ?? "";
}

export function getConfiguredProvider(): LlmProvider {
  return process.env.SUMMARIZER_PROVIDER?.trim().toLowerCase() === "anthropic" ? "anthropic" : "openai";
}

export function getConfiguredModel() {
  if (process.env.SUMMARIZER_MODEL?.trim()) {
    return process.env.SUMMARIZER_MODEL.trim();
  }

  return getConfiguredProvider() === "anthropic" ? "claude-3-5-sonnet-latest" : "gpt-5-mini";
}

export function isLlmConfigured() {
  return Boolean(getApiKey());
}

function extractOpenAiText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as {
    output_text?: string | string[];
    output?: Array<{
      content?: Array<{ text?: string; type?: string }> | string;
    }>;
  };

  if (typeof record.output_text === "string") {
    return record.output_text.trim();
  }

  if (Array.isArray(record.output_text)) {
    return record.output_text.join("").trim();
  }

  const texts =
    record.output?.flatMap((item) => {
      if (typeof item.content === "string") {
        return [item.content];
      }

      return (item.content ?? [])
        .map((part) => (typeof part?.text === "string" ? part.text : ""))
        .filter(Boolean);
    }) ?? [];

  return texts.join("\n").trim();
}

function extractAnthropicText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as {
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  };

  return (record.content ?? [])
    .map((entry) => (entry.type === "text" && typeof entry.text === "string" ? entry.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function extractOpenAiDelta(event: unknown) {
  if (!event || typeof event !== "object") {
    return "";
  }

  const record = event as {
    type?: string;
    delta?: string | { text?: string };
    text?: string;
  };

  if (!record.type?.includes("output_text.delta")) {
    return "";
  }

  if (typeof record.delta === "string") {
    return record.delta;
  }

  if (typeof record.delta?.text === "string") {
    return record.delta.text;
  }

  if (typeof record.text === "string") {
    return record.text;
  }

  return "";
}

function extractAnthropicDelta(event: unknown) {
  if (!event || typeof event !== "object") {
    return "";
  }

  const record = event as {
    type?: string;
    delta?: { text?: string };
  };

  if (record.type !== "content_block_delta") {
    return "";
  }

  return typeof record.delta?.text === "string" ? record.delta.text : "";
}

function buildOpenAiRequestBody({ systemPrompt, prompt, temperature = 0.2, maxOutputTokens = 700 }: GenerateLlmTextOptions) {
  return {
    model: getConfiguredModel(),
    instructions: systemPrompt,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
    max_output_tokens: maxOutputTokens,
    temperature,
    store: false,
  };
}

function buildAnthropicRequestBody({ systemPrompt, prompt, temperature = 0.2, maxOutputTokens = 700 }: GenerateLlmTextOptions) {
  return {
    model: getConfiguredModel(),
    system: systemPrompt,
    max_tokens: maxOutputTokens,
    temperature,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };
}

async function generateOpenAiText(options: GenerateLlmTextOptions, apiKey: string) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildOpenAiRequestBody(options)),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}: ${await response.text()}`);
  }

  return extractOpenAiText(await response.json());
}

async function generateAnthropicText(options: GenerateLlmTextOptions, apiKey: string) {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(buildAnthropicRequestBody(options)),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}: ${await response.text()}`);
  }

  return extractAnthropicText(await response.json());
}

export async function generateLlmText(options: GenerateLlmTextOptions) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("SUMMARIZER_API_KEY is not configured.");
  }

  return getConfiguredProvider() === "anthropic"
    ? generateAnthropicText(options, apiKey)
    : generateOpenAiText(options, apiKey);
}

async function createOpenAiStream(options: GenerateLlmTextOptions, apiKey: string) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      ...buildOpenAiRequestBody(options),
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming LLM request failed with status ${response.status}: ${await response.text()}`);
  }

  return {
    body: response.body,
    extractDelta: extractOpenAiDelta,
  };
}

async function createAnthropicStream(options: GenerateLlmTextOptions, apiKey: string) {
  const response = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      ...buildAnthropicRequestBody(options),
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming LLM request failed with status ${response.status}: ${await response.text()}`);
  }

  return {
    body: response.body,
    extractDelta: extractAnthropicDelta,
  };
}

export async function streamLlmText(options: GenerateLlmTextOptions) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("SUMMARIZER_API_KEY is not configured.");
  }

  const { body, extractDelta } =
    getConfiguredProvider() === "anthropic"
      ? await createAnthropicStream(options, apiKey)
      : await createOpenAiStream(options, apiKey);

  const reader = body.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<string>({
    async start(controller) {
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          let boundaryIndex = buffer.indexOf("\n\n");

          while (boundaryIndex >= 0) {
            const chunk = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);

            for (const line of chunk.split("\n")) {
              if (!line.startsWith("data:")) {
                continue;
              }

              const data = line.slice(5).trim();

              if (!data || data === "[DONE]") {
                continue;
              }

              const delta = extractDelta(JSON.parse(data));

              if (delta) {
                controller.enqueue(delta);
              }
            }

            boundaryIndex = buffer.indexOf("\n\n");
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

export function streamStaticText(text: string) {
  return new ReadableStream<string>({
    start(controller) {
      if (text) {
        controller.enqueue(text);
      }

      controller.close();
    },
  });
}
