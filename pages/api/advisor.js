import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const { prompt, context } = req.body || {};

  if (!apiKey) {
    return res.status(200).json({
      success: true,
      aiActive: false,
      data: {
        advisory: "Gemini API key is not configured in App Settings.",
        notice: "Please add GEMINI_API_KEY to your environment variables or platform secrets.",
      },
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemPrompt = "You are Beacon.ai, an AI disaster escape and life-safety intelligence assistant. Provide immediate, action-oriented, clear safety advisories for user evacuations, weather alerts, shelter selection, and route planning. Keep responses formatted with bullet points or numbered action steps.";
    
    const userMessage = context
      ? `User Prompt: ${prompt}\n\nCurrent Location & Environment Context:\n${JSON.stringify(context, null, 2)}`
      : prompt || "Give immediate emergency preparedness guidance for sudden flood or wildfire warnings.";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return res.status(200).json({
      success: true,
      aiActive: true,
      data: {
        text: response.text,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate AI advisory",
    });
  }
}
