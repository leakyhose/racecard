import { config } from "dotenv";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import * as z from "zod";
import type { Flashcard } from "@shared/types.js";
import fs from "fs";

const distractorPrompt = fs.readFileSync("./src/distractorPrompt.md", "utf-8");

const MODEL_NAME = "gemini-2.5-flash";
const BATCH_SIZE = 25;

config();

let client: GoogleGenerativeAI | null = null;

function getClient() {
  if (!client && process.env.GEMINI_API_KEY) {
    client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return client;
}

const ids: string[] = [];
for (let i = 0; i < BATCH_SIZE; i++) {
  ids.push(`c${i}`);
}

const DistractorsPerCard = z.array(z.string().min(1)).length(3);

async function generateDistractors(
  apiClient: GoogleGenerativeAI,
  pairs: { question: string; answer: string }[],
  onProgress?: (completed: number, total: number) => void,
): Promise<{
  distractors: string[][];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  const resultsByIndex = new Map<number, string[]>();
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;

  const batches: {
    id: string;
    originalIndex: number;
    question: string;
    answer: string;
  }[][] = [];

  for (let i = 0; i < Math.ceil(pairs.length / BATCH_SIZE); i++) {
    batches[i] = [];
  }

  for (let i = 0; i < pairs.length; i += 1) {
    const batchIndex = Math.floor(i / BATCH_SIZE);
    const idInBatch = i % BATCH_SIZE;
    const pair = pairs[i]!;
    batches[batchIndex]!.push({
      id: `c${idInBatch}`,
      originalIndex: i,
      question: pair.question,
      answer: pair.answer,
    });
  }

  let completedBatches = 0;
  const totalBatches = batches.length;

  const batchPromises = batches.map(async (initialBatch, batchIndex) => {
    const MAX_RETRIES = 3;
    let currentBatch = initialBatch;
    const batchResults = new Map<
      string,
      { distractors: string[]; originalIndex: number }
    >();

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const batchSchema: Record<string, typeof DistractorsPerCard> = {};
        for (const item of currentBatch) {
          batchSchema[item.id] = DistractorsPerCard;
        }

        const DistractorSet = z.object({
          distractors: z.object(batchSchema),
        });

        const model = apiClient.getGenerativeModel({
          model: MODEL_NAME,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: SchemaType.OBJECT,
              properties: {
                distractors: {
                  type: SchemaType.OBJECT,
                  properties: Object.fromEntries(
                    currentBatch.map((item) => [
                      item.id,
                      {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                      },
                    ]),
                  ),
                  required: currentBatch.map((item) => item.id),
                },
              },
            },
          },
        });

        const result = await model.generateContent([
          distractorPrompt,
          JSON.stringify(currentBatch),
        ]);

        const response = result.response;
        const content = response.text();

        if (!content) {
          throw new Error("Empty response from LLM");
        }

        const parsedRaw = JSON.parse(content);
        const parsed = DistractorSet.parse(parsedRaw);

        if (response.usageMetadata) {
          totalPromptTokens += response.usageMetadata.promptTokenCount;
          totalCompletionTokens += response.usageMetadata.candidatesTokenCount;
          totalTokens += response.usageMetadata.totalTokenCount;
        }

        if (!parsed) {
          throw new Error(
            `Failed to parse distractors response for batch ${batchIndex + 1}`,
          );
        }

        const nextBatch: {
          id: string;
          originalIndex: number;
          question: string;
          answer: string;
        }[] = [];

        for (const item of currentBatch) {
          const llmDistractors = parsed.distractors[item.id];

          if (llmDistractors) {
            batchResults.set(item.id, {
              distractors: llmDistractors,
              originalIndex: item.originalIndex,
            });
          } else {
            nextBatch.push(item);
          }
        }

        if (nextBatch.length === 0) {
          completedBatches++;
          onProgress?.(completedBatches, totalBatches);

          for (const item of initialBatch) {
            const result = batchResults.get(item.id)!;
            resultsByIndex.set(result.originalIndex, result.distractors);
          }

          return {
            usage: {
              promptTokens: totalPromptTokens,
              completionTokens: totalCompletionTokens,
              totalTokens,
            },
          };
        }

        if (attempt === MAX_RETRIES - 1) {
          throw new Error(
            `Failed to get distractors for ${nextBatch.length} items in batch ${batchIndex + 1} after ${MAX_RETRIES} attempts. Missing IDs: ${nextBatch.map((item) => item.id).join(", ")}`,
          );
        }

        currentBatch = nextBatch;
        console.warn(
          `Batch ${batchIndex + 1} attempt ${attempt + 1}: Retrying ${nextBatch.length} missing items...`,
        );
      } catch (error: any) {
        if (error.status === 429) {
          let retryAfterMs = error.headers?.["retry-after-ms"];
          let retryAfter = error.headers?.["retry-after"];

          if (
            !retryAfterMs &&
            !retryAfter &&
            error.headers &&
            typeof error.headers.get === "function"
          ) {
            retryAfterMs = error.headers.get("retry-after-ms");
            retryAfter = error.headers.get("retry-after");
          }

          let waitTime = 1000;
          if (retryAfterMs) {
            waitTime = parseInt(retryAfterMs, 10);
          } else if (retryAfter) {
            waitTime = parseInt(retryAfter, 10) * 1000;
          }

          console.warn(
            `Batch ${
              batchIndex + 1
            }: Rate limit hit. Waiting ${waitTime}ms before retrying...`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));

          attempt--;
          continue;
        }

        if (attempt === MAX_RETRIES - 1) throw error;
        console.warn(
          `Batch ${batchIndex + 1} attempt ${attempt + 1} failed:`,
          error,
        );
      }
    }

    throw new Error(
      `Failed to generate distractors for batch ${batchIndex + 1} after ${MAX_RETRIES} attempts`,
    );
  });

  const results = await Promise.all(batchPromises);

  results.forEach((result) => {
    totalPromptTokens += result.usage.promptTokens;
    totalCompletionTokens += result.usage.completionTokens;
    totalTokens += result.usage.totalTokens;
  });

  const allDistractors: string[][] = [];
  for (let i = 0; i < pairs.length; i++) {
    const distractors = resultsByIndex.get(i);
    if (!distractors) {
      throw new Error(`Missing distractors for index ${i}`);
    }
    allDistractors.push(distractors);
  }

  return {
    distractors: allDistractors,
    usage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens,
    },
  };
}

export async function generateResponse(
  flashcards: Flashcard[],
  mode: "term" | "definition" | "both",
  onProgress?: (message: string) => void,
) {
  const apiClient = getClient();
  if (!apiClient) {
    throw new Error("Gemini API key not configured");
  }

  const totalTermBatches =
    mode === "definition" || mode === "both"
      ? Math.ceil(flashcards.length / BATCH_SIZE)
      : 0;
  const totalDefinitionBatches =
    mode === "term" || mode === "both"
      ? Math.ceil(flashcards.length / BATCH_SIZE)
      : 0;
  const totalBatches = totalTermBatches + totalDefinitionBatches;

  let completedBatches = 0;

  const updateProgress = () => {
    completedBatches++;
    onProgress?.(`${completedBatches}/${totalBatches} batches complete`);
  };

  const termPairs = flashcards.map((card) => ({
    question: card.question,
    answer: card.answer,
  }));

  const definitionPairs = flashcards.map((card) => ({
    question: card.answer,
    answer: card.question,
  }));

  let termResult, definitionResult;

  const promises = [];

  if (mode === "definition" || mode === "both") {
    promises.push(
      generateDistractors(apiClient, termPairs, () => updateProgress()),
    );
  }

  if (mode === "term" || mode === "both") {
    promises.push(
      generateDistractors(apiClient, definitionPairs, () => updateProgress()),
    );
  }

  const results = await Promise.all(promises);

  if (mode === "definition") {
    termResult = results[0];
  } else if (mode === "term") {
    definitionResult = results[0];
  } else {
    termResult = results[0];
    definitionResult = results[1];
  }

  const totalUsage = {
    promptTokens:
      (termResult?.usage.promptTokens || 0) +
      (definitionResult?.usage.promptTokens || 0),
    completionTokens:
      (termResult?.usage.completionTokens || 0) +
      (definitionResult?.usage.completionTokens || 0),
    totalTokens:
      (termResult?.usage.totalTokens || 0) +
      (definitionResult?.usage.totalTokens || 0),
  };

  console.log(totalUsage);

  return JSON.stringify({
    termDistractors: termResult?.distractors,
    definitionDistractors: definitionResult?.distractors,
  });
}
