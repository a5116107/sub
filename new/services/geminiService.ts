import { GoogleGenAI } from "@google/genai";

export const generateCodeSnippet = async (prompt: string): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Using flash for speed in the UI demo
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a short, impressive code snippet (TypeScript or Python) that solves the following problem or matches the description: "${prompt}". 
      Do not include markdown code blocks (\`\`\`). Just return the raw code. Keep it under 15 lines.`,
    });

    return response.text || "// No code generated";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "// Error generating code. Please check API Key configuration.";
  }
};