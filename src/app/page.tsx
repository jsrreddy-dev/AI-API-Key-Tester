"use client";

import { useState } from "react";

type ProviderId = "openai" | "anthropic" | "gemini" | "groq" | "mistral" | "nvidia";

interface Provider {
  id: ProviderId;
  name: string;
}

const PROVIDERS: Provider[] = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "gemini", name: "Google Gemini" },
  { id: "groq", name: "Groq" },
  { id: "mistral", name: "Mistral AI" },
  { id: "nvidia", name: "NVIDIA" },
];

function estimateContextLimit(modelId: string) {
  const id = modelId.toLowerCase();
  if (id.includes('gpt-4o') || id.includes('gpt-4-turbo')) return "128,000 tokens";
  if (id.includes('gpt-4')) return "8,192 tokens";
  if (id.includes('gpt-3.5-turbo-16k')) return "16,385 tokens";
  if (id.includes('gpt-3.5-turbo')) return "4,096 tokens";
  if (id.includes('claude-3') || id.includes('claude-3.5')) return "200,000 tokens";
  if (id.includes('gemini-1.5-pro')) return "2,000,000 tokens";
  if (id.includes('gemini-1.5-flash')) return "1,000,000 tokens";
  if (id.includes('gemini')) return "32,768 tokens";
  if (id.includes('llama-3.1') || id.includes('llama3.1')) return "128,000 tokens";
  if (id.includes('llama-3') || id.includes('llama3')) return "8,192 tokens";
  if (id.includes('mixtral-8x22b')) return "65,536 tokens";
  if (id.includes('mixtral')) return "32,768 tokens";
  if (id.includes('mistral-large')) return "128,000 tokens";
  if (id.includes('mistral')) return "8,192 tokens";
  if (id.includes('deepseek')) return "128,000 tokens"; 
  if (id.includes('qwen2') || id.includes('qwen-2')) return "128,000 tokens";
  if (id.includes('gemma-2')) return "8,192 tokens";
  if (id.includes('jamba-1.5-large')) return "256,000 tokens";
  if (id.includes('jamba-1.5-mini')) return "256,000 tokens";
  return "Unknown (Check provider docs)";
}

export default function Home() {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [showAllModels, setShowAllModels] = useState(false);
  const [selectedModelDetails, setSelectedModelDetails] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleTestKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("Please enter an API key.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setShowAllModels(false);
    setSelectedModelDetails(null);
    setSearchQuery("");

    try {
      const response = await fetch(`/api/verify/${selectedProvider}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify API key");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredModels = result?.models?.filter((model: any) => 
    model.id.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <main style={{ padding: "4rem 2rem", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
      <div className="animate-fade-in" style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem" }}>
          <span className="glow-text">AI API Key</span> Tester
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", maxWidth: "500px", margin: "0 auto" }}>
          Securely validate your API keys from various AI providers. Keys are never stored, they are only used once to verify access.
        </p>
      </div>

      <div className="glass-panel animate-fade-in delay-100" style={{ padding: "2rem" }}>
        <form onSubmit={handleTestKey}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.75rem", fontWeight: "500" }}>
              Select AI Provider
            </label>
            <div className="provider-grid">
              {PROVIDERS.map((provider) => (
                <div
                  key={provider.id}
                  className={`provider-card ${selectedProvider === provider.id ? "selected" : ""}`}
                  onClick={() => setSelectedProvider(provider.id)}
                >
                  {provider.name}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <label htmlFor="apiKey" style={{ display: "block", marginBottom: "0.75rem", fontWeight: "500" }}>
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              className="modern-input"
              placeholder={`Enter your ${PROVIDERS.find(p => p.id === selectedProvider)?.name} API Key`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <button
            type="submit"
            className="modern-button"
            style={{ width: "100%" }}
            disabled={isLoading || !apiKey.trim()}
          >
            {isLoading ? "Verifying..." : "Test API Key"}
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-panel animate-fade-in" style={{ padding: "1.5rem", marginTop: "2rem", borderLeft: "4px solid var(--error-color)" }}>
          <div className="status-badge status-error" style={{ marginBottom: "1rem" }}>
            <div className="status-dot"></div>
            Invalid or Expired Key
          </div>
          <p style={{ color: "var(--error-color)", fontSize: "0.95rem" }}>{error}</p>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="glass-panel animate-fade-in" style={{ padding: "1.5rem", marginTop: "2rem", borderLeft: "4px solid var(--success-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
            <div className="status-badge status-success">
              <div className="status-dot"></div>
              Valid Key
            </div>
            {result.provider && (
              <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                {result.provider}
              </span>
            )}
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {result.models && result.models.length > 0 && (
              <div style={{ gridColumn: "1 / -1", background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                  <h3 style={{ fontSize: "1rem", color: "var(--text-secondary)", margin: 0 }}>
                    Available Models ({filteredModels.length}{searchQuery ? ` of ${result.models.length}` : ""})
                  </h3>
                  <input 
                    type="text" 
                    placeholder="Search models..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="modern-input"
                    style={{ width: "200px", padding: "8px 12px", fontSize: "0.85rem", background: "rgba(0,0,0,0.3)" }}
                  />
                </div>
                
                {filteredModels.length === 0 ? (
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No models found matching "{searchQuery}".</p>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {(showAllModels || searchQuery ? filteredModels : filteredModels.slice(0, 8)).map((model: any) => (
                      <button 
                        key={model.id}
                        onClick={() => setSelectedModelDetails(model)}
                        style={{ 
                          background: "rgba(255,255,255,0.05)", 
                          padding: "6px 10px", 
                          borderRadius: "6px", 
                          fontSize: "0.85rem", 
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "var(--text-primary)",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                        onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      >
                        {model.id}
                      </button>
                    ))}
                    {!showAllModels && !searchQuery && filteredModels.length > 8 && (
                      <button 
                        onClick={() => setShowAllModels(true)}
                        style={{ 
                          padding: "6px 10px", 
                          fontSize: "0.85rem", 
                          color: "var(--text-secondary)",
                          background: "transparent",
                          border: "1px dashed rgba(255,255,255,0.2)",
                          borderRadius: "6px",
                          cursor: "pointer"
                        }}
                      >
                        +{filteredModels.length - 8} more
                      </button>
                    )}
                    {showAllModels && !searchQuery && filteredModels.length > 8 && (
                      <button 
                        onClick={() => setShowAllModels(false)}
                        style={{ 
                          padding: "6px 10px", 
                          fontSize: "0.85rem", 
                          color: "var(--text-secondary)",
                          background: "transparent",
                          border: "1px dashed rgba(255,255,255,0.2)",
                          borderRadius: "6px",
                          cursor: "pointer"
                        }}
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {result.contextLimit && (
              <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "12px" }}>
                <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Max Context Limit</h3>
                <p style={{ fontSize: "1.2rem", fontWeight: "600" }}>{result.contextLimit}</p>
              </div>
            )}
            
            {result.accountInfo && (
              <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "12px" }}>
                <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Account Details</h3>
                <p style={{ fontSize: "0.95rem" }}>{result.accountInfo}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Model Details Modal */}
      {selectedModelDetails && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "2rem"
        }} onClick={() => setSelectedModelDetails(null)}>
          <div 
            className="glass-panel animate-fade-in"
            style={{ padding: "2rem", width: "100%", maxWidth: "600px", maxHeight: "80vh", overflowY: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedModelDetails(null)}
              style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.5rem" }}
            >
              &times;
            </button>
            <h2 style={{ marginBottom: "0.5rem", fontSize: "1.5rem", paddingRight: "2rem" }}>
              {selectedModelDetails.id}
            </h2>
            <div style={{ display: "inline-block", background: "rgba(99, 102, 241, 0.15)", color: "var(--accent-color)", padding: "4px 10px", borderRadius: "16px", fontSize: "0.8rem", fontWeight: "600", marginBottom: "1.5rem", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
              Context Limit: {selectedModelDetails.details?.context_window 
                ? `${selectedModelDetails.details.context_window.toLocaleString()} tokens` 
                : estimateContextLimit(selectedModelDetails.id)}
            </div>
            
            <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", overflowX: "auto" }}>
              <pre style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", fontFamily: "var(--font-geist-mono), monospace", whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
                {JSON.stringify({
                  ...selectedModelDetails.details,
                  context_limit_estimate: selectedModelDetails.details?.context_window ? undefined : estimateContextLimit(selectedModelDetails.id)
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
