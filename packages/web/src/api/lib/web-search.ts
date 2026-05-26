const SERPER_URL = "https://google.serper.dev/search";

export async function webSearch(query: string, maxResults = 3): Promise<string> {
  const apiKey = process.env.SERPER_API_KEY?.trim();
  if (!apiKey) return "";

  try {
    const res = await fetch(SERPER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ q: query, num: maxResults }),
    });

    if (!res.ok) {
      console.warn("[web-search] HTTP", res.status);
      return "";
    }

    const data = (await res.json()) as {
      organic?: { title?: string; snippet?: string }[];
      answerBox?: { answer?: string; snippet?: string };
    };

    const parts: string[] = [];
    if (data.answerBox?.answer) parts.push(data.answerBox.answer);
    else if (data.answerBox?.snippet) parts.push(data.answerBox.snippet);

    for (const item of data.organic ?? []) {
      if (item.title && item.snippet) {
        parts.push(`${item.title}: ${item.snippet}`);
      }
    }

    return parts.slice(0, maxResults).join("\n");
  } catch (err) {
    console.warn("[web-search]", err);
    return "";
  }
}
