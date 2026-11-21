const apiKey = process.env.TAVILY_API_KEY;

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
};

export async function webSearch(query: string): Promise<WebSearchResult[]> {
  if (!apiKey) return [];

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
    }),
  });

  if (!response.ok) throw new Error(`Web search failed with status ${response.status}`);
  const data = (await response.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
  return (data.results ?? [])
    .filter((result) => result.title && result.url && result.content)
    .map((result) => ({ title: result.title!, url: result.url!, content: result.content! }));
}
