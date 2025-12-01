import { config } from "dotenv";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import * as z from "zod";
import type { Flashcard } from "@shared/types.js";

const MODEL_NAME = "gpt-4.1-mini";
const BATCH_SIZE = 50;

// Load environment variables
config();

// Single prompt for both terms and definitions
if (!process.env.DISTRACTOR_PROMPT) {
  throw new Error("DISTRACTOR_PROMPT environment variable is required");
}

const distractorPrompt: string = process.env.DISTRACTOR_PROMPT;
let client: OpenAI | null = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

// Zod schema for distractors
const DistractorSet = z.object({
  distractors: z.array(z.array(z.string().min(1)).length(3)),
});

// Generic function to generate distractors for any field
async function generateDistractors(
  apiClient: OpenAI,
  pairs: { question: string; answer: string }[],
  onProgress?: (completed: number, total: number) => void,
): Promise<{ distractors: string[][], usage: { promptTokens: number, completionTokens: number, totalTokens: number } }> {
  const allDistractors: string[][] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;

  // Split into batches and process in parallel
  const batches: { question: string; answer: string }[][] = [];
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    batches.push(pairs.slice(i, i + BATCH_SIZE));
  }

  let completedBatches = 0;
  const totalBatches = batches.length;

  // Process all batches in parallel
  const batchPromises = batches.map(async (batch, batchIndex) => {
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await apiClient.chat.completions.parse({
          model: MODEL_NAME,

          messages: [
            {
              role: "system",
              content: distractorPrompt,
            },
            {
              role: "user",
              content: JSON.stringify(batch),
            },
          ],
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
          throw new Error(`Failed to parse distractors response for batch ${batchIndex + 1}`);
        }

        if (parsed.distractors.length !== batch.length) {
          console.warn(
            `Batch ${batchIndex + 1} attempt ${attempt + 1}: Expected ${batch.length} distractors, got ${parsed.distractors.length}. Retrying...`,
          );
          if (attempt === MAX_RETRIES - 1) {
            throw new Error(
              `Expected ${batch.length} distractor sets, got ${parsed.distractors.length} after ${MAX_RETRIES} attempts`,
            );
          }
          continue;
        }

        completedBatches++;
        onProgress?.(completedBatches, totalBatches);
        return { distractors: parsed.distractors, usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens, totalTokens } };
      } catch (error) {
        if (attempt === MAX_RETRIES - 1) throw error;
        console.warn(`Batch ${batchIndex + 1} attempt ${attempt + 1} failed:`, error);
      }
    }

    throw new Error(`Failed to generate distractors for batch ${batchIndex + 1} after ${MAX_RETRIES} attempts`);
  });

  const results = await Promise.all(batchPromises);
  results.forEach((result) => {
    allDistractors.push(...result.distractors);
    totalPromptTokens += result.usage.promptTokens;
    totalCompletionTokens += result.usage.completionTokens;
    totalTokens += result.usage.totalTokens;
  });

  return { distractors: allDistractors, usage: { promptTokens: totalPromptTokens, completionTokens: totalCompletionTokens, totalTokens } };
}

export async function generateResponse(
  flashcards: Flashcard[],
  onProgress?: (message: string) => void,
) {
  const apiClient = getClient();
  if (!apiClient) {
    throw new Error("OpenAI API key not configured");
  }

  const totalTermBatches = Math.ceil(flashcards.length / BATCH_SIZE);
  const totalDefinitionBatches = Math.ceil(flashcards.length / BATCH_SIZE);
  const totalBatches = totalTermBatches + totalDefinitionBatches;

  let completedBatches = 0;

  const updateProgress = () => {
    completedBatches++;
    onProgress?.(`${completedBatches}/${totalBatches} batches complete`);
  };

  // Create pairs for both term and definition generation
  const termPairs = flashcards.map((card) => ({
    question: card.question,  // Question provides context
    answer: card.answer,      // AI matches answer (term) format
  }));

  const definitionPairs = flashcards.map((card) => ({
    question: card.answer,    
    answer: card.question,   
  }));

  // Generate distractors for both in parallel
  const [termResult, definitionResult] = await Promise.all([
    generateDistractors(apiClient, termPairs, () => updateProgress()),      // First call
    generateDistractors(apiClient, definitionPairs, () => updateProgress()), // Second call
  ]);

  // Calculate total usage
  const totalUsage = {
    promptTokens: termResult.usage.promptTokens + definitionResult.usage.promptTokens,
    completionTokens: termResult.usage.completionTokens + definitionResult.usage.completionTokens,
    totalTokens: termResult.usage.totalTokens + definitionResult.usage.totalTokens,
  };

  return JSON.stringify({
    termDistractors: termResult.distractors,
    definitionDistractors: definitionResult.distractors,
  });
}

