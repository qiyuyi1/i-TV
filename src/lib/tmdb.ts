const TMDB_API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

async function fetchTMDB(url: string, options?: RequestInit) {
  // 直接使用 v3 API Key 作为查询参数（最稳定可靠）
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
    const url = `${BASE_URL}/search/${type}?query=${encodeURIComponent(
      query
    )}&language=zh-CN&include_adult=false&page=1`;

    const response = await fetchTMDB(url);

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `TMDB search error: status=${response.status}, body=${body}`
      );
      throw new Error(
        `TMDB 搜索失败 (状态码: ${response.status})。请检查 TMDB API 凭证是否正确。`
      );
    }

    const data = await response.json();
    return data.results || [];
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
