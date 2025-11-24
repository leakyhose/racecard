import { config } from "dotenv";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import * as z from "zod";
import type { Flashcard } from "@shared/types.js";

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

// Define Zod schema for distractor generation
const DistractorSet = z.object({
  distractors: z.array(z.array(z.string().min(1)).length(3)),
});

export async function generateResponse(flashcards: Flashcard[]) {
  const apiClient = getClient();
  if (!apiClient) {
    throw new Error("OpenAI API key not configured");
  }

  const flashcardCount = flashcards.length;

  // Determine batch size based on flashcard count
  let batchSize = flashcardCount;
  if (flashcardCount > 100 && flashcardCount <= 150) {
    batchSize = Math.ceil(flashcardCount / 3); // Split into 3 parts
  } else if (flashcardCount > 50 && flashcardCount <= 100) {
    batchSize = Math.ceil(flashcardCount / 2); // Split into 2 parts
  }

  const allDistractors: string[][] = [];

  // Process in batches
  for (let i = 0; i < flashcardCount; i += batchSize) {
    const batch = flashcards.slice(i, i + batchSize);
    const cleanedBatch = batch.map((card) => ({
      question: card.question,
      answer: card.answer,
    }));

    const response = await apiClient.chat.completions.parse({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: process.env.SYSTEM_PROMPT!,
        },
        {
          role: "user",
          content: JSON.stringify(cleanedBatch),
        },
      ],
      response_format: zodResponseFormat(DistractorSet, "distractor_set"),
    });

    const parsed = response.choices[0]!.message.parsed;

    if (!parsed) {
      throw new Error(
        `Failed to parse response for batch ${Math.floor(i / batchSize) + 1}`,
      );
    }

    // Validate that we got the correct number of distractor sets for this batch
    if (parsed.distractors.length !== batch.length) {
      throw new Error(
        `Expected ${batch.length} distractor sets, got ${parsed.distractors.length}`,
      );
    }

    allDistractors.push(...parsed.distractors);
  }

  // Return as JSON string to match existing interface
  return JSON.stringify(allDistractors);
}
