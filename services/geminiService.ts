import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateExplosionReport = async (wind: number, temp: number, mode: 'wind' | 'water' | 'bomb'): Promise<string> => {
  try {
    if (!apiKey) return "Missing API Key: The dryer exploded into a void of nothingness.";

    let toolType = 'Hairdryer';
    let action = 'blowing air';

    if (mode === 'water') {
      toolType = 'High-Pressure Water Sprayer';
      action = 'spraying water';
    } else if (mode === 'bomb') {
      toolType = 'Personal Ballistic Launcher';
      action = 'firing micro-explosives';
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `The user was playing a game. They used a modified ${toolType} (${action}) set to Power Level ${wind}/100 and Temperature ${temp}°C, then pressed the self-destruct button.
      
      Write a funny, sarcastic, 1-sentence "Coroner's Report" or "Fire Dept Statement" about the cause of the disaster. Be creative with the physics of ${temp}°C ${mode}.`,
    });

    return response.text || "The device has ceased to be.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The blast was so powerful it severed the connection to the AI server.";
  }
};