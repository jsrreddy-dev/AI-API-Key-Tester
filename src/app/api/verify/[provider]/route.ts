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

    // 1. Key Format Pre-Validation
    validateKeyFormat(provider, apiKey);

    let result = null;
    switch (provider) {
      case "openai": result = await verifyOpenAI(apiKey); break;
      case "anthropic": result = await verifyAnthropic(apiKey); break;
      case "gemini": result = await verifyGemini(apiKey); break;
      case "groq": result = await verifyGroq(apiKey); break;
      case "mistral": result = await verifyMistral(apiKey); break;
      case "nvidia": result = await verifyNvidia(apiKey); break;
      case "cohere": result = await verifyCohere(apiKey); break;
      case "perplexity": result = await verifyPerplexity(apiKey); break;
      case "together": result = await verifyTogether(apiKey); break;
      case "openrouter": result = await verifyOpenRouter(apiKey); break;
      default: return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(`Verification error for ${provider}:`, error.message);
    return NextResponse.json(
      { error: error.message || "Failed to verify API key" },
      { status: error.status || 401 }
    );
  }
}

// -------------------------------------------------------------
// Pre-Validation Logic
// -------------------------------------------------------------
function validateKeyFormat(provider: string, key: string) {
  const trimKey = key.trim();
  switch (provider) {
    case "openai":
      if (!trimKey.startsWith("sk-")) throw new CustomError("Invalid Format: OpenAI keys must start with 'sk-'.", 400);
      break;
    case "anthropic":
      if (!trimKey.startsWith("sk-ant-")) throw new CustomError("Invalid Format: Anthropic keys must start with 'sk-ant-'.", 400);
      break;
    case "gemini":
      if (!trimKey.startsWith("AIza")) throw new CustomError("Invalid Format: Google Gemini keys must start with 'AIza'.", 400);
      break;
    case "groq":
      if (!trimKey.startsWith("gsk_")) throw new CustomError("Invalid Format: Groq keys must start with 'gsk_'.", 400);
      break;
    case "cohere":
      if (trimKey.length < 30) throw new CustomError("Invalid Format: Cohere key is too short.", 400);
      break;
  }
}

class CustomError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
  }
}

// -------------------------------------------------------------
// Error Handling & Parsing
// -------------------------------------------------------------
async function handleApiError(res: Response, defaultMessage: string) {
  if (res.ok) return;
  
  let errorMsg = defaultMessage;
  try {
    const data = await res.json();
    errorMsg = data.error?.message || data.error || data.message || data.detail || defaultMessage;
  } catch(e) {}

  let status = res.status;
  if (status === 401) throw new CustomError(`Unauthorized: ${errorMsg}`, 401);
  if (status === 403) throw new CustomError(`Forbidden: The key lacks permissions. ${errorMsg}`, 403);
  if (status === 402) throw new CustomError(`Payment Required: The account is out of credits. ${errorMsg}`, 402);
  if (status === 429) throw new CustomError(`Rate Limited / Out of Quota: ${errorMsg}`, 429);
  
  throw new CustomError(errorMsg, status);
}

// -------------------------------------------------------------
// Provider Verifications
// -------------------------------------------------------------

async function verifyOpenAI(apiKey: string) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  await handleApiError(res, "Invalid OpenAI API Key");
  
  const reqLimit = res.headers.get("x-ratelimit-limit-requests");
  const tokLimit = res.headers.get("x-ratelimit-limit-tokens");
  const tierInfo = reqLimit ? `Rate Limits: ${reqLimit} Req/min | ${tokLimit} Tokens/min` : "Valid API Key.";

  const data = await res.json();
  return {
    provider: "OpenAI",
    models: data.data.filter((m: any) => m.id.startsWith("gpt") || m.id.startsWith("o1")).map((m: any) => ({ id: m.id, details: m })),
    contextLimit: "Up to 128,000 tokens",
    accountInfo: tierInfo,
  };
}

async function verifyAnthropic(apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
  });
  await handleApiError(res, "Invalid Anthropic API Key");

  const reqLimit = res.headers.get("anthropic-ratelimit-requests-limit");
  const tierInfo = reqLimit ? `Rate Limits: ${reqLimit} Req/min (Determines Account Tier)` : "Valid API Key.";

  const data = await res.json();
  return {
    provider: "Anthropic",
    models: data.data?.map((m: any) => ({ id: m.id || m.display_name, details: m })) || [],
    contextLimit: "200,000 tokens",
    accountInfo: tierInfo,
  };
}

async function verifyGemini(apiKey: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  await handleApiError(res, "Invalid Gemini API Key");
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
  await handleApiError(res, "Invalid Groq API Key");
  const reqLimit = res.headers.get("x-ratelimit-limit-requests");
  const tierInfo = reqLimit ? `Rate Limits: ${reqLimit} Req/min` : "Valid Groq API Key.";
  const data = await res.json();
  return {
    provider: "Groq",
    models: data.data.map((m: any) => ({ id: m.id, details: m })),
    contextLimit: "Variable by model",
    accountInfo: tierInfo,
  };
}

async function verifyMistral(apiKey: string) {
  const res = await fetch("https://api.mistral.ai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }});
  await handleApiError(res, "Invalid Mistral API Key");
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
  await handleApiError(res, "Invalid NVIDIA API Key");
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
  await handleApiError(res, "Invalid Cohere API Key");
  const data = await res.json();
  return {
    provider: "Cohere",
    models: data.models.map((m: any) => ({ id: m.name, details: m })),
    contextLimit: "Up to 128,000 tokens",
    accountInfo: "Valid Cohere API Key.",
  };
}

async function verifyPerplexity(apiKey: string) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "sonar-small-chat", messages: [{role: "user", content: "test"}], max_tokens: 1 })
  });
  await handleApiError(res, "Invalid Perplexity API Key");
  return {
    provider: "Perplexity",
    models: [{ id: "sonar-small-chat", details: {} }, { id: "sonar-small-online", details: {} }, { id: "sonar-medium-chat", details: {} }],
    contextLimit: "Variable by model",
    accountInfo: "Valid Perplexity API Key.",
  };
}

async function verifyTogether(apiKey: string) {
  const res = await fetch("https://api.together.xyz/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }});
  await handleApiError(res, "Invalid Together AI API Key");
  const data = await res.json();
  return {
    provider: "Together AI",
    models: data.map((m: any) => ({ id: m.id, details: m })),
    contextLimit: "Variable by model",
    accountInfo: "Valid Together AI API Key.",
  };
}

async function verifyOpenRouter(apiKey: string) {
  // OpenRouter has a dedicated endpoint for fetching the exact balance and usage!
  const authRes = await fetch("https://openrouter.ai/api/v1/auth/key", { headers: { Authorization: `Bearer ${apiKey}` }});
  await handleApiError(authRes, "Invalid OpenRouter API Key");
  const authData = await authRes.json();

  const modelRes = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }});
  const modelData = await modelRes.json();

  let accountDetails = "Valid OpenRouter API Key.";
  if (authData.data) {
    const { limit, usage, is_free_tier } = authData.data;
    if (limit !== null) {
      accountDetails = `Balance: $${(limit - usage).toFixed(4)} remaining out of $${limit} limit.\nTier: ${is_free_tier ? "Free" : "Paid"}`;
    } else {
      accountDetails = `Usage: $${usage.toFixed(4)}\nTier: ${is_free_tier ? "Free" : "Paid"} (No Limit set)`;
    }
  }

  return {
    provider: "OpenRouter",
    models: modelData.data.map((m: any) => ({ id: m.id, details: m })),
    contextLimit: "Variable by model",
    accountInfo: accountDetails,
  };
}
