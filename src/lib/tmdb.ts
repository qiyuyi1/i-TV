const TMDB_API_KEY = process.env.TMDB_API_KEY || "6f2ebf91068b990d60df622f05f4892";
const BASE_URL = "https://api.themoviedb.org/3";

async function fetchTMDB(url: string, options?: RequestInit) {
  const urlWithKey = url.includes("?")
    ? `${url}&api_key=${TMDB_API_KEY}`
    : `${url}?api_key=${TMDB_API_KEY}`;

  const response = await fetch(urlWithKey, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-cache",
  });

  return response;
}

export async function searchTMDB(query: string, type: string = "multi") {
  try {
    // Primary search with Chinese language
    const zhUrl = `${BASE_URL}/search/${type}?query=${encodeURIComponent(
      query
    )}&language=zh-CN&include_adult=false&page=1`;

    const zhResponse = await fetchTMDB(zhUrl);

    if (!zhResponse.ok) {
      const body = await zhResponse.text().catch(() => "");
      console.error(
        `TMDB search error: status=${zhResponse.status}, body=${body}`
      );
      throw new Error(
        `TMDB 搜索失败 (状态码: ${zhResponse.status})。请检查 TMDB API 凭证是否正确。`
      );
    }

    const zhData = await zhResponse.json();
    const zhResults = zhData.results || [];

    // If Chinese search has results, return them
    if (zhResults.length > 0) {
      return zhResults;
    }

    // Fallback: try with original language (no language filter) for better results
    const enUrl = `${BASE_URL}/search/${type}?query=${encodeURIComponent(
      query
    )}&include_adult=false&page=1`;

    const enResponse = await fetchTMDB(enUrl);

    if (enResponse.ok) {
      const enData = await enResponse.json();
      const enResults = enData.results || [];
      return enResults;
    }

    // If both fail, return empty
    return [];
  } catch (error) {
    console.error("TMDB search error:", error);
    throw error;
  }
}

export async function getTMDBDetails(id: string, type: string = "movie") {
  try {
    const url = `${BASE_URL}/${type}/${id}?language=zh-CN&append_to_response=genres,credits`;

    const response = await fetchTMDB(url);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `TMDB details error: status=${response.status}, body=${body}`
      );
      throw new Error(
        `TMDB 详情获取失败 (状态码: ${response.status})`
      );
    }

    return await response.json();
  } catch (error) {
    console.error("TMDB details error:", error);
    throw error;
  }
}

export function getImageUrl(path: string | null, size: string = "w500"): string | undefined {
  if (!path) return undefined;
  // If already a full URL, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
