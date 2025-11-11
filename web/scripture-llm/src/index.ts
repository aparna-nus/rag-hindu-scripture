export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // --- CORS preflight ---
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // --- Only allow POST ---
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Use POST only" }),
        { status: 405, headers: corsHeaders() }
      );
    }

    try {
      // --- Parse incoming JSON ---
      const jsonBody = await request.json();

      if (!jsonBody.question || !jsonBody.contexts) {
        return jsonError("Missing fields: question or contexts");
      }

      const { question, contexts } = jsonBody;

      // --- Build context block ---
      const contextText = contexts
        .map((c: any) => `• ${c.text} (${c.id})`)
        .join("\n");

      const prompt = `
You are a concise scholarly assistant. Answer in 3–5 sentences, academically and clearly.
Base your answer ONLY on the passages provided. If the question is broad, synthesize key teachings
into 2–3 perspectives (e.g., duty, knowledge, devotion) and include at least two citations when available.
If something is not explicit in the passages, say so briefly and then give the closest relevant teaching with citations.

Question:
${question}

Relevant passages:
${contextText}

Answer:
`.trim();

      // --- Call Groq ---
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a concise scholarly assistant." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
        }),
      });

      const groqText = await groqRes.text();

      // If Groq returned an error or not JSON
      if (!groqRes.ok) {
        return jsonError("Groq error", groqText);
      }

      let data;
      try {
        data = JSON.parse(groqText);
      } catch {
        return jsonError("Groq returned non-JSON", groqText);
      }

      const answer = data?.choices?.[0]?.message?.content;

      if (!answer) {
        return jsonError("Groq returned no answer field", data);
      }

      // --- Return success ---
      return new Response(JSON.stringify({ answer }), {
        status: 200,
        headers: corsHeaders(),
      });

    } catch (err: any) {
      return jsonError("Unhandled worker exception", String(err));
    }
  }
};

// ---------------- helpers ----------------

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

function jsonError(msg: string, extra: any = null) {
  return new Response(JSON.stringify({ error: msg, extra }), {
    status: 500,
    headers: corsHeaders(),
  });
}
