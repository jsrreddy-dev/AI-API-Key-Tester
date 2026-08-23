import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { apiKey, provider, model, message } = await request.json();

    if (!apiKey || !provider || !model || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let responseText = "";

    // Grouping OpenAI-compatible providers
    const openAICompatibleProviders = ["openai", "groq", "mistral", "nvidia", "perplexity", "together", "openrouter"];

    if (openAICompatibleProviders.includes(provider)) {
      const endpoints: Record<string, string> = {
        openai: "https://api.openai.com/v1/chat/completions",
        groq: "https://api.groq.com/openai/v1/chat/completions",
        mistral: "https://api.mistral.ai/v1/chat/completions",
        nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
        perplexity: "https://api.perplexity.ai/chat/completions",
        together: "https://api.together.xyz/v1/chat/completions",
        openrouter: "https://openrouter.ai/api/v1/chat/completions",
      };

      const res = await fetch(endpoints[provider], {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: message }],
          max_tokens: 200,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || err.detail || err.message || "Chat request failed");
      }

      const data = await res.json();
      responseText = data.choices[0]?.message?.content || "";
      
    } else if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 200,
          messages: [{ role: "user", content: message }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Chat request failed");
      }

      const data = await res.json();
      responseText = data.content[0]?.text || "";

    } else if (provider === "gemini") {
      // For Gemini, the model needs to be prefixed with 'models/' if not already, but we pass it directly usually
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Chat request failed");
      }

      const data = await res.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    } else if (provider === "cohere") {
      const res = await fetch("https://api.cohere.com/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          accept: "application/json",
        },
        body: JSON.stringify({
          model,
          message: message,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Chat request failed");
      }

      const data = await res.json();
      responseText = data.text || "";
    } else {
      return NextResponse.json({ error: "Unsupported provider for chat" }, { status: 400 });
    }

    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: error.message || "An error occurred during chat" }, { status: 500 });
  }
}
