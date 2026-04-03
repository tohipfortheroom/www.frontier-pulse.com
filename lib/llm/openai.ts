const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type GenerateLlmTextOptions = {
  systemPrompt: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

function getApiKey() {
  return process.env.SUMMARIZER_API_KEY?.trim() ?? "";
}

export function getConfiguredModel() {
  return process.env.SUMMARIZER_MODEL?.trim() || "gpt-5-mini";
}

export function isLlmConfigured() {
  return Boolean(getApiKey());
}

function extractResponseText(payload: unknown): string {
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

function extractTextDelta(event: unknown) {
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

function buildRequestBody({ systemPrompt, prompt, temperature = 0.2, maxOutputTokens = 700 }: GenerateLlmTextOptions) {
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

export async function generateLlmText(options: GenerateLlmTextOptions) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("SUMMARIZER_API_KEY is not configured.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(buildRequestBody(options)),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}: ${await response.text()}`);
  }

  return extractResponseText(await response.json());
}

export async function streamLlmText(options: GenerateLlmTextOptions) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error("SUMMARIZER_API_KEY is not configured.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      ...buildRequestBody(options),
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Streaming LLM request failed with status ${response.status}: ${await response.text()}`);
  }

  const reader = response.body.getReader();
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

              const delta = extractTextDelta(JSON.parse(data));

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
