const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BEARER_TOKEN = process.env.TMDB_BEARER_TOKEN;
const BASE_URL = "https://api.themoviedb.org/3";

const headers = {
  Authorization: `Bearer ${TMDB_BEARER_TOKEN}`,
  "Content-Type": "application/json",
};

export async function searchTMDB(query: string, type: string = "multi") {
  try {
    const response = await fetch(
      `${BASE_URL}/search/${type}?query=${encodeURIComponent(
        query
      )}&language=zh-CN&include_adult=false&page=1`,
      { headers, cache: "no-cache" }
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
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
    const response = await fetch(
      `${BASE_URL}/${type}/${id}?language=zh-CN&append_to_response=genres,credits`,
      { headers, cache: "no-cache" }
    );

    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("TMDB details error:", error);
    throw error;
  }
}

export function getImageUrl(path: string | null, size: string = "w500") {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
