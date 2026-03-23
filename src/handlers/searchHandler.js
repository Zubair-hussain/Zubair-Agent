// ─────────────────────────────────────────────────────────────────────────────
//  SERP SEARCH HANDLER
//  Uses SerpApi (free 100/month) to search Google for errors, bugs, tech Q&A
//  Get free key at: https://serpapi.com
// ─────────────────────────────────────────────────────────────────────────────

export const searchWeb = async (query) => {
  if (!process.env.SERP_API_KEY) {
    return {
      success: false,
      message: "Search is not configured. Add SERP_API_KEY to your .env to enable live search.",
      results: [],
    };
  }

  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERP_API_KEY}&num=5&hl=en&gl=us`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`SerpApi error: ${response.status}`);
  }

  const data = await response.json();
  const organic = data.organic_results || [];

  const results = organic.slice(0, 5).map((r) => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet,
  }));

  return {
    success: true,
    query,
    totalResults: data.search_information?.total_results || "N/A",
    results,
  };
};

export const formatSearchResults = (data, originalMessage) => {
  if (!data.success) {
    return `🔍 Search unavailable: ${data.message}\n\nYou can search manually: https://www.google.com/search?q=${encodeURIComponent(originalMessage)}`;
  }

  if (data.results.length === 0) {
    return `🔍 No results found for: *"${data.query}"*\n\nTry: https://stackoverflow.com/search?q=${encodeURIComponent(data.query)}`;
  }

  const list = data.results
    .map((r, i) => `**${i + 1}. ${r.title}**\n${r.snippet}\n🔗 ${r.link}`)
    .join("\n\n");

  return `🔍 **Search results for:** *"${data.query}"*\n\n${list}\n\n---\n💡 Need Zubair to help fix or implement this? Type *"hire"* or *"book a call"*.`;
};
