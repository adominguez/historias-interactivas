import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { socialCaptionSchema } from "@src/schemas";
import { generateSocialCaptionPrompt } from "@src/utils/prompts";
import type { SocialCaptionPromptInput } from "@src/utils/socialFormats";
import { OPENAI_API_KEY } from "astro:env/server";

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

// Genera en UNA sola llamada el texto de Facebook, el de Instagram y los
// hashtags para una publicación automática (ver social-auto-post.ts) — no
// dos llamadas separadas, para no duplicar el coste de IA de cada
// publicación.
export const generateSocialCaption = async (input: SocialCaptionPromptInput) => {
  const { object } = await generateObject({
    model: openai('gpt-5-nano'),
    maxOutputTokens: 2000,
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
    prompt: generateSocialCaptionPrompt(input),
    schema: socialCaptionSchema,
  });
  return object;
};
