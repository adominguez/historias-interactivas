// import { openai } from "@ai-sdk/openai";
// import { generateObject } from "ai";
// import { fullSchema } from "@src/schemas";
// import { generateStorySetup, truncateString } from "@src/utils/characters";
// import OpenAI from "openai";
// import { v2 as cloudinary } from 'cloudinary'

console.log();

export function GET(request: Request) {
  return new Response(import.meta.env.TURSO_DATABASE_URL);
}