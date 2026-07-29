import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  const { prompt, context } = req.body || {};

  if (!apiKey) {
    return res.status(200).json({
      success: true,
      aiActive: false,
      data: {
        advisory: "Groq API key is not configured in App Settings.",
        notice: "Please add GROQ_API_KEY to your environment variables or platform secrets.",
      },
    });
  }

  try {
    const groq = new Groq({ apiKey });
    const systemPrompt = "You are Beacon.ai, an AI disaster escape and life-safety intelligence assistant. Provide immediate, action-oriented, clear safety advisories for user evacuations, weather alerts, shelter selection, and route planning. Keep responses formatted with bullet points or numbered action steps.";

    const userMessage = context
      ? `User Prompt: ${prompt}\n\nCurrent Location & Environment Context:\n${JSON.stringify(context, null, 2)}`
      : prompt || "Give immediate emergency preparedness guidance for sudden flood or wildfire warnings.";

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    return res.status(200).json({
      success: true,
      aiActive: true,
      data: {
        text: response.choices[0]?.message?.content || "",
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to generate AI advisory",
    });
  }
}
