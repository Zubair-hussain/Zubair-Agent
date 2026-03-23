// ─────────────────────────────────────────────────────────────────────────────
//  SERP Service — Live search via SerpAPI (100 free searches/month)
//  Used when user asks about errors, bugs, or how-to tech questions
//  Get free key at: https://serpapi.com
// ─────────────────────────────────────────────────────────────────────────────

const SERP_URL = "https://serpapi.com/search.json";

/**
 * Search Google via SerpAPI and return top 3 results
 */
export const searchWeb = async (query) => {
  if (!process.env.SERP_API_KEY) {
    return {
      success: false,
      fallback: true,
      message: `SERP API not configured. Here's what I suggest searching on Google:\n🔍 **"${query}"**\n\nUseful resources:\n• https://stackoverflow.com/search?q=${encodeURIComponent(query)}\n• https://developer.mozilla.org\n• https://docs.npmjs.com`,
    };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      api_key: process.env.SERP_API_KEY,
      num: 5,
      hl: "en",
      gl: "us",
    });

    const response = await fetch(`${SERP_URL}?${params}`);
    if (!response.ok) throw new Error(`SERP API error: ${response.status}`);

    const data = await response.json();
    const results = data.organic_results?.slice(0, 3) || [];

    if (results.length === 0) {
      return {
        success: false,
        message: `No results found for: "${query}". Try rephrasing your search.`,
      };
    }

    return {
      success: true,
      query,
      results: results.map((r) => ({
        title: r.title,
        link: r.link,
        snippet: r.snippet,
      })),
    };
  } catch (err) {
    return {
      success: false,
      message: `Search temporarily unavailable. Try: https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
    };
  }
};

/**
 * Format SERP results into a readable response
 */
export const formatSearchResponse = (query, serpResult) => {
  if (!serpResult.success) {
    return `🔍 **Searching for:** "${query}"\n\n${serpResult.message || serpResult.fallback}`;
  }

  const resultText = serpResult.results
    .map((r, i) => `**${i + 1}. ${r.title}**\n${r.snippet}\n🔗 ${r.link}`)
    .join("\n\n");

  return `🔍 **Search results for:** "${query}"\n\n${resultText}\n\n> 💡 Need help implementing a fix? Zubair can debug this for you — message on WhatsApp: https://wa.me/923110302103`;
};
