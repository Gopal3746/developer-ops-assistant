import OpenAI from "openai";

import type {
  ClassificationPrompt,
  IssueClassificationClient,
} from "./issue-classifier.js";

export interface OpenAIClassificationClientOptions {
  apiKey: string;
  model: string;
  client?: OpenAI;
}

export class OpenAIClassificationResponseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "OpenAIClassificationResponseError";
  }
}

export function createOpenAIClassificationClient(
  options: OpenAIClassificationClientOptions,
): IssueClassificationClient {
  const apiKey = options.apiKey.trim();
  const model = options.model.trim();

  if (!apiKey) {
    throw new Error("OpenAI API key must not be empty");
  }

  if (!model) {
    throw new Error("OpenAI model must not be empty");
  }

  const client =
    options.client ??
    new OpenAI({
      apiKey,
    });

  return {
    model,

    async generateClassification(
      prompt: ClassificationPrompt,
    ): Promise<unknown> {
      const response = await client.responses.create({
        model,
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
          format: {
            type: "json_schema",
            name: "issue_classification",
            strict: true,
            schema: {
              type: "object",
              properties: {
                category: {
                  type: "string",
                  enum: [
                    "bug",
                    "feature",
                    "question",
                    "documentation",
                    "other",
                  ],
                },
                priority: {
                  type: "string",
                  enum: [
                    "low",
                    "medium",
                    "high",
                    "urgent",
                  ],
                },
                summary: {
                  type: "string",
                  minLength: 1,
                  maxLength: 500,
                },
              },
              required: [
                "category",
                "priority",
                "summary",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const outputText = response.output_text.trim();

      if (!outputText) {
        throw new OpenAIClassificationResponseError(
          "OpenAI returned an empty classification response",
        );
      }

      try {
        return JSON.parse(outputText) as unknown;
      } catch (error) {
        throw new OpenAIClassificationResponseError(
          "OpenAI returned invalid classification JSON",
          {
            cause: error,
          },
        );
      }
    },
  };
}
