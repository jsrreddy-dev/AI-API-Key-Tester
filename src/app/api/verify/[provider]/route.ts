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
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Invalid OpenAI API Key");
  }

  const data = await res.json();
  const models = data.data
    .filter((m: any) => m.id.startsWith("gpt"))
    .map((m: any) => ({ id: m.id, details: m }));

  return {
    provider: "OpenAI",
    models: models,
    contextLimit: "128,000 tokens (GPT-4o)",
    accountInfo: `Access to ${models.length} OpenAI models.`,
  };
}

async function verifyAnthropic(apiKey: string) {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });

  if (!res.ok) {
    const fallbackRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }]
      }),
    });

    if (!fallbackRes.ok) {
      const errorData = await fallbackRes.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "Invalid Anthropic API Key");
    }

    return {
      provider: "Anthropic",
      models: [
        { id: "claude-3-opus", details: { family: "Claude 3" } },
        { id: "claude-3-sonnet", details: { family: "Claude 3" } },
        { id: "claude-3-haiku", details: { family: "Claude 3" } },
        { id: "claude-3-5-sonnet", details: { family: "Claude 3.5" } }
      ],
      contextLimit: "200,000 tokens (Claude 3/3.5 Family)",
      accountInfo: "Valid API Key. Account active.",
    };
  }

  const data = await res.json();
  const models = data.data?.map((m: any) => ({ id: m.id || m.display_name, details: m })) || [];
  
  return {
    provider: "Anthropic",
    models: models,
    contextLimit: "200,000 tokens (Claude 3/3.5 Family)",
    accountInfo: "Valid API Key. Account active.",
  };
}

async function verifyGemini(apiKey: string) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Invalid Google Gemini API Key");
  }

  const data = await res.json();
  const models = data.models.map((m: any) => ({ id: m.name.replace("models/", ""), details: m }));

  return {
    provider: "Google Gemini",
    models: models,
    contextLimit: "Up to 2,000,000 tokens (Gemini 1.5 Pro)",
    accountInfo: "Valid API Key.",
  };
}

async function verifyGroq(apiKey: string) {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Invalid Groq API Key");
  }

  const data = await res.json();
  const models = data.data.map((m: any) => ({ id: m.id, details: m }));

  return {
    provider: "Groq",
    models: models,
    contextLimit: "Variable by model (Llama/Mixtral/Gemma)",
    accountInfo: "Valid Groq API Key.",
  };
}

async function verifyMistral(apiKey: string) {
  const res = await fetch("https://api.mistral.ai/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Invalid Mistral API Key");
  }

  const data = await res.json();
  const models = data.data.map((m: any) => ({ id: m.id, details: m }));

  return {
    provider: "Mistral AI",
    models: models,
    contextLimit: "Up to 128,000 tokens (Mistral Large)",
    accountInfo: "Valid Mistral API Key.",
  };
}

async function verifyNvidia(apiKey: string) {
  const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Invalid NVIDIA API Key");
  }

  const data = await res.json();
  const models = data.data.map((m: any) => ({ id: m.id, details: m }));

  return {
    provider: "NVIDIA",
    models: models,
    contextLimit: "Variable by model",
    accountInfo: "Valid NVIDIA NIM API Key.",
  };
}
