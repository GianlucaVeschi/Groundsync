
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function parseDecisionVoice(audioBase64: string, categories: string[]) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/mp3',
              data: audioBase64
            }
          },
          {
            text: `Transcribe this audio recording from a construction site and categorize it. 
                   Available categories: ${categories.join(', ')}. 
                   Return the result in JSON format.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: 'The transcribed decision text' },
            category: { type: Type.STRING, description: 'The most appropriate category from the list' }
          },
          required: ['text', 'category']
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}
