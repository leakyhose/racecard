import { config } from "dotenv";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import * as z from "zod";
import type { Flashcard } from "@shared/types.js";
import fs from "fs";

const distractorPrompt = fs.readFileSync("./src/distractorPrompt.md", "utf-8");

const MODEL_NAME = "gpt-4.1";
const BATCH_SIZE = 25;

// Load environment variables
config();

let client: OpenAI | null = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

const ids: string[] = [];
for (let i = 0; i < BATCH_SIZE; i++) {
  ids.push(`c${i}`);
}

const DistractorsPerCard = z.array(z.string().min(1)).length(3);

// Generic function to generate distractors for any field
async function generateDistractors(
  apiClient: OpenAI,
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
  // Create a map to store results by original index
  const resultsByIndex = new Map<number, string[]>();
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;

  // Split into batches and process in parallel
  const batches: {
    id: string;
    originalIndex: number;
    question: string;
    answer: string;
  }[][] = [];

  // Initialize batches
  for (let i = 0; i < Math.ceil(pairs.length / BATCH_SIZE); i++) {
    batches[i] = [];
  }

  for (let i = 0; i < pairs.length; i += 1) {
    const batchIndex = Math.floor(i / BATCH_SIZE);
    const idInBatch = i % BATCH_SIZE;
    const pair = pairs[i]!;
    batches[batchIndex]!.push({
      id: `c${idInBatch}`,
      originalIndex: i, // Store original index
      question: pair.question,
      answer: pair.answer,
    });
  }

  let completedBatches = 0;
  const totalBatches = batches.length;

  // Process all batches in parallel
  const batchPromises = batches.map(async (initialBatch, batchIndex) => {
    const MAX_RETRIES = 3;
    let currentBatch = initialBatch;
    const batchResults = new Map<
      string,
      { distractors: string[]; originalIndex: number }
    >();

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Create schema dynamically based on current batch IDs
        const batchSchema: Record<string, typeof DistractorsPerCard> = {};
        for (const item of currentBatch) {
          batchSchema[item.id] = DistractorsPerCard;
        }

        const DistractorSet = z.object({
          distractors: z.object(batchSchema),
        });

        const response = await apiClient.chat.completions.parse({
          model: MODEL_NAME,

          messages: [
            {
              role: "system",
              content: distractorPrompt,
            },
            {
              role: "user",
              content: JSON.stringify(currentBatch),
            },
          ],
          //reasoning:{"effort": "minimal"},
          response_format: zodResponseFormat(DistractorSet, "distractor_set"),

        });

        const parsed = response.choices[0]!.message.parsed;
        // Track token usage
        if (response.usage) {
          totalPromptTokens += response.usage.prompt_tokens;
          totalCompletionTokens += response.usage.completion_tokens;
          totalTokens += response.usage.total_tokens;
        }

        if (!parsed) {
          throw new Error(
            `Failed to parse distractors response for batch ${batchIndex + 1}`,
          );
        }

        // Match IDs from LLM response to requested IDs
        const nextBatch: {
          id: string;
          originalIndex: number;
          question: string;
          answer: string;
        }[] = [];

        // Process each item in current batch
        for (const item of currentBatch) {
          const llmDistractors = parsed.distractors[item.id];

          if (llmDistractors) {
            // LLM provided distractors for this ID - store with original index
            batchResults.set(item.id, {
              distractors: llmDistractors,
              originalIndex: item.originalIndex,
            });
          } else {
            // LLM didn't provide distractors, add to next batch
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

        // If this is the last retry and we still have missing items, throw error
        if (attempt === MAX_RETRIES - 1) {
          throw new Error(
            `Failed to get distractors for ${nextBatch.length} items in batch ${batchIndex + 1} after ${MAX_RETRIES} attempts. Missing IDs: ${nextBatch.map((item) => item.id).join(", ")}`,
          );
        }

        // Update current batch to only retry missing items
        currentBatch = nextBatch;
        console.warn(
          `Batch ${batchIndex + 1} attempt ${attempt + 1}: Retrying ${nextBatch.length} missing items...`,
        );
      } catch (error) {
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

  // Accumulate token usage
  results.forEach((result) => {
    totalPromptTokens += result.usage.promptTokens;
    totalCompletionTokens += result.usage.completionTokens;
    totalTokens += result.usage.totalTokens;
  });

  // Build final array in original order
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
    throw new Error("OpenAI API key not configured");
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

  // Create pairs for both term and definition generation
  const termPairs = flashcards.map((card) => ({
    question: card.question, // Question provides context
    answer: card.answer, // AI matches answer (term) format
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

  // Calculate total usage
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
