import type OpenAI from "openai";
import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  createOpenAIClassificationClient,
  OpenAIClassificationResponseError,
} from "../src/ai/openai-classification-client.js";

const prompt = {
  system: "Classify this GitHub issue.",
  user: JSON.stringify({
    title: "Synchronization fails",
  }),
};

function createMockOpenAI(
  outputText: string,
): {
  client: OpenAI;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn().mockResolvedValue({
    output_text: outputText,
  });

  return {
    client: {
      responses: {
        create,
      },
    } as unknown as OpenAI,
    create,
  };
}

describe("OpenAI classification client", () => {
  it("requests and parses a structured classification", async () => {
    const { client, create } = createMockOpenAI(
      JSON.stringify({
        category: "bug",
        priority: "high",
        summary: "Synchronization returns an error.",
      }),
    );

    const classificationClient =
      createOpenAIClassificationClient({
        apiKey: "test-api-key",
        model: "test-model",
        client,
      });

    await expect(
      classificationClient.generateClassification(
        prompt,
      ),
    ).resolves.toEqual({
      category: "bug",
      priority: "high",
      summary: "Synchronization returns an error.",
    });

    expect(classificationClient.model).toBe(
      "test-model",
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        store: false,
        input: [
          {
            role: "system",
            content: prompt.system,
          },
          {
            role: "user",
            content: prompt.user,
          },
        ],
        text: {
          format: expect.objectContaining({
            type: "json_schema",
            name: "issue_classification",
            strict: true,
            schema: expect.objectContaining({
              required: [
                "category",
                "priority",
                "summary",
              ],
              additionalProperties: false,
            }),
          }),
        },
      }),
    );
  });

  it("rejects an empty response", async () => {
    const { client } = createMockOpenAI("   ");
    const classificationClient =
      createOpenAIClassificationClient({
        apiKey: "test-api-key",
        model: "test-model",
        client,
      });

    await expect(
      classificationClient.generateClassification(
        prompt,
      ),
    ).rejects.toThrowError(
      OpenAIClassificationResponseError,
    );
  });

  it("rejects invalid JSON", async () => {
    const { client } = createMockOpenAI(
      "not valid JSON",
    );
    const classificationClient =
      createOpenAIClassificationClient({
        apiKey: "test-api-key",
        model: "test-model",
        client,
      });

    await expect(
      classificationClient.generateClassification(
        prompt,
      ),
    ).rejects.toThrowError(
      "OpenAI returned invalid classification JSON",
    );
  });

  it("rejects empty configuration values", () => {
    expect(() =>
      createOpenAIClassificationClient({
        apiKey: " ",
        model: "test-model",
      }),
    ).toThrowError("OpenAI API key must not be empty");

    expect(() =>
      createOpenAIClassificationClient({
        apiKey: "test-api-key",
        model: " ",
      }),
    ).toThrowError("OpenAI model must not be empty");
  });
});
