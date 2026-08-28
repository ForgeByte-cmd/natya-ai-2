import { GoogleGenAI } from "@google/genai";

/**
 * Uploads a performance video file to the Gemini Files API and polls
 * until processing is ACTIVE before returning the processed file.
 */
export async function uploadGeminiVideo(
  ai: GoogleGenAI,
  filePath: string,
  mimeType: string
) {
  const file = await ai.files.upload({
    file: filePath,
    config: {
      mimeType,
    },
  });

  let processedFile = await ai.files.get({
    name: file.name,
  });

  while (processedFile.state === "PROCESSING") {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    processedFile = await ai.files.get({
      name: file.name,
    });
  }

  if (processedFile.state === "FAILED") {
    throw new Error("Gemini video processing failed");
  }

  return processedFile;
}
