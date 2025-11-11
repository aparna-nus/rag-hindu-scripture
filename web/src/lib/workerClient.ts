export async function callLLM(
  workerUrl: string,
  question: string,
  topChunks: {
    id: string;
    text: string;
    work?: string;
  }[]
): Promise<string> {
  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        contexts: topChunks
      })
    });

    if (!res.ok) {
      console.error("Worker error:", await res.text());
      return "LLM error — could not generate response.";
    }

    const data = await res.json();
    return data.answer || "No answer.";
  } catch (err) {
    console.error("LLM call failed:", err);
    return "Failed to contact LLM backend.";
  }
}
