const TAVILY_URL = "https://api.tavily.com/search";

export async function webSearch(query: string, maxResults = 3): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return "";

  try {
    const res = await fetch(TAVILY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: "basic",
        include_answer: "basic",
      }),
    });

    if (!res.ok) {
      console.warn("[web-search] HTTP", res.status);
      return "";
    }

    const data = (await res.json()) as {
      answer?: string;
      results?: { title?: string; content?: string }[];
    };

    const parts: string[] = [];
    if (data.answer?.trim()) parts.push(data.answer.trim());

    for (const item of data.results ?? []) {
      if (item.title && item.content) {
        parts.push(`${item.title}: ${item.content}`);
      }
    }

    return parts.slice(0, maxResults).join("\n");
  } catch (err) {
    console.warn("[web-search]", err);
    return "";
  }
}
