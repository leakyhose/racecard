import { config } from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import type { Flashcard } from "@shared/types.js";
import fs from "fs";

const distractorPrompt = fs.readFileSync("./src/distractorPrompt.md", "utf-8");

const MODEL_NAME = "gemini-2.5-flash";
const BATCH_SIZE = 25;

config();

let model: ChatGoogleGenerativeAI | null = null;

function getModel() {
  if (!model && process.env.GEMINI_API_KEY) {
    model = new ChatGoogleGenerativeAI({
      model: MODEL_NAME,
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return model;
}

// Zod schema for distractor output - each card gets exactly 3 distractors
const DistractorItemSchema = z.object({
  id: z.string().describe("The card ID (e.g., c0, c1, c2)"),
  distractors: z
    .array(z.string().min(1))
    .length(3)
    .describe("Exactly 3 incorrect alternatives for the answer"),
});

const DistractorResponseSchema = z.object({
  results: z
    .array(DistractorItemSchema)
    .describe("Array of distractor results for each card"),
});

type DistractorResponse = z.infer<typeof DistractorResponseSchema>;

async function generateDistractors(
  llm: ChatGoogleGenerativeAI,
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

  // Create batches
  const batches: {
    id: string;
    originalIndex: number;
    question: string;
    answer: string;
  }[][] = [];

  for (let i = 0; i < Math.ceil(pairs.length / BATCH_SIZE); i++) {
    batches[i] = [];
  }

  for (let i = 0; i < pairs.length; i++) {
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

  // Create structured output model using LangChain's withStructuredOutput
  const structuredModel = llm.withStructuredOutput(DistractorResponseSchema);

  const batchPromises = batches.map(async (initialBatch, batchIndex) => {
    const MAX_RETRIES = 3;
    let currentBatch = initialBatch;
    const batchResults = new Map<
      string,
      { distractors: string[]; originalIndex: number }
    >();

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const inputData = currentBatch.map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
        }));

        const response = await structuredModel.invoke([
          ["system", distractorPrompt],
          ["human", JSON.stringify(inputData)],
        ]);

        // Validate with Zod (already done by withStructuredOutput, but we can double-check)
        const parsed = DistractorResponseSchema.parse(response);

        // Map results by ID
        const responseMap = new Map<string, string[]>();
        for (const item of parsed.results) {
          responseMap.set(item.id, item.distractors);
        }

        const nextBatch: typeof currentBatch = [];

        for (const item of currentBatch) {
          const llmDistractors = responseMap.get(item.id);

          if (llmDistractors && llmDistractors.length === 3) {
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
        // Handle rate limiting
        if (error.status === 429 || error.message?.includes("429")) {
          let waitTime = 1000;

          const retryAfterMs =
            error.headers?.["retry-after-ms"] ||
            error.headers?.get?.("retry-after-ms");
          const retryAfter =
            error.headers?.["retry-after"] ||
            error.headers?.get?.("retry-after");

          if (retryAfterMs) {
            waitTime = parseInt(retryAfterMs, 10);
          } else if (retryAfter) {
            waitTime = parseInt(retryAfter, 10) * 1000;
          }

          console.warn(
            `Batch ${batchIndex + 1}: Rate limit hit. Waiting ${waitTime}ms before retrying...`,
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
  const llm = getModel();
  if (!llm) {
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
      generateDistractors(llm, termPairs, () => updateProgress()),
    );
  }

  if (mode === "term" || mode === "both") {
    promises.push(
      generateDistractors(llm, definitionPairs, () => updateProgress()),
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
