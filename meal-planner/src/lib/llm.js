import { mockCallLLM } from "./mockLLM.js";

// Single point of contact with whichever LLM backs the app. Swap the body
// of this function for a real request (Claude `/v1/messages`, OpenAI chat
// completions, a backend proxy, etc). Every caller only depends on this
// signature: (prompt: string) => Promise<string> of raw text.
export async function callLLM(prompt) {
  return mockCallLLM(prompt);
}

function stripCodeFences(text) {
  if (!text) return text;
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export function parseJSONResponse(raw) {
  try {
    return { ok: true, data: JSON.parse(stripCodeFences(raw)) };
  } catch (err) {
    return { ok: false, error: err };
  }
}
