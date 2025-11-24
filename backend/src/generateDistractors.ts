import {config} from "dotenv";
import OpenAI from "openai";
import type { Flashcard } from "@shared/types.js";

// Load environment variables
config();
console.log(process.env.OPENAI_API_KEY);

let client: OpenAI | null = null;

function getClient() {
  if (!client && process.env.OPENAI_API_KEY) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

export async function generateResponse(flashcards: Flashcard[]) {
  const apiClient = getClient();
  if (!apiClient) {
    throw new Error("OpenAI API key not configured");
  }
  
  const response = await apiClient.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content: process.env.SYSTEM_PROMPT!,
      },
      {
        role: "user",
        content: flashcards.map((flashcard: Flashcard) => {
          return `Q: ${flashcard.question}\nA: ${flashcard.answer}`;
        }).toString(),
      },
    ],
    temperature: 0.9,
  });

  return response.choices[0]!.message?.content;
}

