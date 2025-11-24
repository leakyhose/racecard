import {config} from "dotenv";
import OpenAI from "openai";
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

export async function generateResponse(flashcards: Flashcard[]) {
  const apiClient = getClient();
  if (!apiClient) {
    throw new Error("OpenAI API key not configured");
  }
  
  const systemPrompt = process.env.SYSTEM_PROMPT!;

  const userContent = flashcards.map((flashcard: Flashcard) => {
    return `■Q ${flashcard.question}\n■A ${flashcard.answer}`;
  }).join('\n\n');


  const response = await apiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    temperature: 0.9,
  });
  return response.choices[0]!.message?.content;
}

