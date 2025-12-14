"use client";
import { useState, useEffect } from "react";

type Provider = "openai" | "anthropic" | "gemini" | "openrouter" | "ollama" | "custom";

const PRESETS: Record<Provider, { baseUrl: string; model: string }> = {
    openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    anthropic: { baseUrl: "https://api.anthropic.com", model: "claude-3-5-sonnet-20241022" },
    gemini: { baseUrl: "https://generativelanguage.googleapis.com", model: "gemini-2.0-flash-exp" },
    openrouter: { baseUrl: "https://openrouter.ai/api/v1", model: "anthropic/claude-3.5-sonnet" },
    ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
    custom: { baseUrl: "", model: "" },
};

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const [provider, setProvider] = useState<Provider>("openai");
    const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
    const [apiKey, setApiKey] = useState("");
    const [model, setModel] = useState("gpt-4o-mini");
    const [temperature, setTemperature] = useState(0.2);
    const [hasApiKey, setHasApiKey] = useState(false);

    useEffect(() => {
        fetch("/api/settings/ai")
            .then((r) => r.json())
            .then((data) => {
                setProvider(data.provider || "openai");
                setBaseUrl(data.baseUrl || "https://api.openai.com/v1");
                setModel(data.model || "gpt-4o-mini");
                setTemperature(data.temperature ?? 0.2);
                setHasApiKey(data.hasApiKey || false);
            })
            .finally(() => setLoading(false));
    }, []);

    const handleProviderChange = (p: Provider) => {
        setProvider(p);
        if (p !== "custom") {
            setBaseUrl(PRESETS[p].baseUrl);
            setModel(PRESETS[p].model);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setTestResult(null);
        try {
            await fetch("/api/settings/ai", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider,
                    baseUrl,
                    apiKey: apiKey || undefined,
                    model,
                    temperature,
                }),
            });
            setHasApiKey(true);
            setApiKey("");
            setTestResult({ success: true, message: "Settings saved!" });
        } catch (e: any) {
            setTestResult({ success: false, message: e.message || "Failed to save" });
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await fetch("/api/settings/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider, baseUrl, apiKey: apiKey || undefined, model }),
            });
            const data = await res.json();
            setTestResult({ success: data.success, message: data.message || data.error || "Unknown result" });
        } catch (e: any) {
            setTestResult({ success: false, message: e.message || "Test failed" });
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-slate-500">Loading settings...</div>;
    }

    return (
        <div className="max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>

            <div className="card p-6 space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Configuration</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Configure the AI provider for the Analyst Workbench. Supports OpenAI, Anthropic (Claude), Google Gemini, OpenRouter, local Ollama, or a custom endpoint.
                </p>

                {/* Security Notice */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div className="flex-1">
                        <p className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">Your API keys are secure</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                            All API keys are encrypted with AES-256 before storage and transmitted securely over TLS 1.3. Your credentials are never shared or used for training AI models.
                            <a href="/security" className="underline hover:text-emerald-900 dark:hover:text-emerald-200 ml-1" target="_blank" rel="noopener">Learn more</a>
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Provider */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Provider</label>
                        <select
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                            value={provider}
                            onChange={(e) => handleProviderChange(e.target.value as Provider)}
                        >
                            <option value="openai">OpenAI (GPT-4, GPT-4o, etc.)</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="gemini">Google Gemini</option>
                            <option value="openrouter">OpenRouter</option>
                            <option value="ollama">Ollama (Local)</option>
                            <option value="custom">Custom Endpoint</option>
                        </select>
                    </div>

                    {/* Base URL */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">API Base URL</label>
                        <input
                            type="url"
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            placeholder="https://api.openai.com/v1"
                        />
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            API Key {hasApiKey && <span className="text-emerald-600 dark:text-emerald-400">(configured)</span>}
                        </label>
                        <input
                            type="password"
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={hasApiKey ? "••••••••••••••••" : "Enter API key"}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            🔒 Encrypted with AES-256 at rest. Leave blank to keep existing key.
                        </p>
                    </div>

                    {/* Model */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model</label>
                        <input
                            type="text"
                            className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            placeholder="gpt-4o-mini"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Examples: gpt-4o-mini, claude-3-5-sonnet-20241022, gemini-2.0-flash-exp, llama3.1, anthropic/claude-3.5-sonnet (OpenRouter)
                        </p>
                    </div>

                    {/* Temperature */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Temperature: {temperature.toFixed(1)}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            className="w-full"
                            value={temperature}
                            onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        />
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Precise (0)</span>
                            <span>Creative (2)</span>
                        </div>
                    </div>

                    {/* Test Result */}
                    {testResult && (
                        <div
                            className={`p-3 rounded text-sm ${testResult.success
                                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                    : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                                }`}
                        >
                            {testResult.success ? "✅" : "❌"} {testResult.message}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            className="px-4 py-2 rounded bg-gold-600 hover:bg-gold-700 text-white transition-colors disabled:opacity-50"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Configuration"}
                        </button>
                        <button
                            className="px-4 py-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
                            onClick={handleTest}
                            disabled={testing}
                        >
                            {testing ? "Testing..." : "Test Connection"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
