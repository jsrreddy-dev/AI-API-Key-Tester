import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    let result = null;

    switch (provider) {
      case "openai":
        result = await verifyOpenAI(apiKey);
        break;
      case "anthropic":
        result = await verifyAnthropic(apiKey);
        break;
      case "gemini":
        result = await verifyGemini(apiKey);
        break;
      case "groq":
        result = await verifyGroq(apiKey);
        break;
      case "mistral":
        result = await verifyMistral(apiKey);
        break;
      case "nvidia":
        result = await verifyNvidia(apiKey);
        break;
      case "cohere":
        result = await verifyCohere(apiKey);
        break;
      case "perplexity":
        result = await verifyPerplexity(apiKey);
        break;
      case "together":
        result = await verifyTogether(apiKey);
        break;
      case "openrouter":
        result = await verifyOpenRouter(apiKey);
        break;
      default:
        return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`Verification error for ${provider}:`, error.message);
    return NextResponse.json(
      { error: error.message || "Failed to verify API key" },
      { status: 401 }
    );
  }
}

async function verifyOpenAI(apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error?.message || "Invalid OpenAI API Key");
  const data = await res.json();
  return {
    provider: "OpenAI",
    models: data.data.filter((m: any) => m.id.startsWith("gpt") || m.id.startsWith("o1")).map((m: any) => ({ id: m.id, details: m })),
    contextLimit: "Up to 128,000 tokens",
    accountInfo: "Valid API Key.",
  };
}

async function verifyAnthropic(apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  });
  if (!res.ok) {
    const fallbackRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
    });
    if (!fallbackRes.ok) throw new Error((await fallbackRes.json().catch(()=>({}))).error?.message || "Invalid Anthropic API Key");
    return {
      provider: "Anthropic",
      models: [{ id: "claude-3-opus", details: {} }, { id: "claude-3-5-sonnet", details: {} }, { id: "claude-3-haiku", details: {} }],
      contextLimit: "200,000 tokens",
      accountInfo: "Valid API Key.",
    };
  }
  const data = await res.json();
  return {
    provider: "Anthropic",
    models: data.data?.map((m: any) => ({ id: m.id || m.display_name, details: m })) || [],
    contextLimit: "200,000 tokens",
    accountInfo: "Valid API Key.",
  };
}

async function verifyGemini(apiKey: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error?.message || "Invalid Gemini API Key");
  const data = await res.json();
  return {
    provider: "Google Gemini",
    models: data.models.map((m: any) => ({ id: m.name.replace("models/", ""), details: m })),
    contextLimit: "Up to 2,000,000 tokens",
    accountInfo: "Valid API Key.",
  };
}

async function verifyGroq(apiKey: string) {
  const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }});
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error?.message || "Invalid Groq API Key");
  const data = await res.json();
  return {
    provider: "Groq",
    models: data.data.map((m: any) => ({ id: m.id, details: m })),
    contextLimit: "Variable by model",
    accountInfo: "Valid Groq API Key.",
  };
}

async function verifyMistral(apiKey: string) {
  const res = await fetch("https://api.mistral.ai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }});
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message || "Invalid Mistral API Key");
  const data = await res.json();
  return {
    provider: "Mistral AI",
    models: data.data.map((m: any) => ({ id: m.id, details: m })),
    contextLimit: "Up to 128,000 tokens",
    accountInfo: "Valid Mistral API Key.",
  };
}

async function verifyNvidia(apiKey: string) {
  const res = await fetch("https://integrate.api.nvidia.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }});
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).detail || "Invalid NVIDIA API Key");
  const data = await res.json();
  return {
    provider: "NVIDIA",
    models: data.data.map((m: any) => ({ id: m.id, details: m })),
    contextLimit: "Variable by model",
    accountInfo: "Valid NVIDIA NIM API Key.",
  };
}

async function verifyCohere(apiKey: string) {
  const res = await fetch("https://api.cohere.com/v1/models", { headers: { Authorization: `Bearer ${apiKey}`, accept: "application/json" }});
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).message || "Invalid Cohere API Key");
  const data = await res.json();
  return {
    provider: "Cohere",
    models: data.models.map((m: any) => ({ id: m.name, details: m })),
    contextLimit: "Up to 128,000 tokens",
    accountInfo: "Valid Cohere API Key.",
  };
}

async function verifyPerplexity(apiKey: string) {
  // Perplexity doesn't have a /models endpoint, verify via a minimal chat completion
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "sonar-small-chat", messages: [{role: "user", content: "test"}], max_tokens: 1 })
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error?.message || "Invalid Perplexity API Key");
  return {
    provider: "Perplexity",
    models: [{ id: "sonar-small-chat", details: {} }, { id: "sonar-small-online", details: {} }, { id: "sonar-medium-chat", details: {} }],
    contextLimit: "Variable by model",
    accountInfo: "Valid Perplexity API Key.",
  };
}

async function verifyTogether(apiKey: string) {
  const res = await fetch("https://api.together.xyz/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }});
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error?.message || "Invalid Together AI API Key");
  const data = await res.json();
  return {
    provider: "Together AI",
    models: data.map((m: any) => ({ id: m.id, details: m })),
    contextLimit: "Variable by model",
    accountInfo: "Valid Together AI API Key.",
  };
}

async function verifyOpenRouter(apiKey: string) {
  const res = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }});
  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error?.message || "Invalid OpenRouter API Key");
  const data = await res.json();
  return {
    provider: "OpenRouter",
    models: data.data.map((m: any) => ({ id: m.id, details: m })),
    contextLimit: "Variable by model",
    accountInfo: "Valid OpenRouter API Key.",
  };
}
