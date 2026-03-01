// src/services/kanjiAliveService.ts

// The RapidAPI key from .env
const API_KEY = import.meta.env.VITE_KANJI_ALIVE_API_KEY;
const API_HOST = 'kanjialive-api.p.rapidapi.com';
const API_BASE_URL = `https://${API_HOST}/api/public`;

export interface KanjiAliveDetails {
  kanji: {
    character: string;
    meaning: {
      english: string;
    };
    strokes: {
      count: number;
      timings: number[];
      images: string[];
    };
    onyomi: {
      romaji: string;
      katakana: string;
    };
    kunyomi: {
      romaji: string;
      hiragana: string;
    };
    video: {
      poster: string;
      mp4: string;
      webm: string;
    };
  };
  radical: {
    character: string;
    strokes: number;
    image: string;
    name: {
      hiragana: string;
      romaji: string;
    };
    meaning: {
      english: string;
    };
    animation: string[];
  };
  references: {
    grade: number | null;
    kodansha: string;
    classic_nelson: string;
  };
}

/**
 * Fetches detailed information for a specific kanji from the Kanji Alive API.
 * 
 * @param kanji The single kanji character to fetch (e.g., "日")
 * @returns The detailed kanji data or null if an error occurs.
 */
export async function fetchKanjiDetails(kanji: string): Promise<KanjiAliveDetails | null> {
  if (!API_KEY) {
    console.error('VITE_KANJI_ALIVE_API_KEY is not defined in environment variables.');
    return null;
  }

  // Double check that it's a single kanji character
  if (!kanji || kanji.length > 1) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/kanji/${encodeURIComponent(kanji)}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Kanji not found in the Kanji Alive database (they have 1235 kanji)
        return null; // Return null gracefully
      }
      throw new Error(`Kanji Alive API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Check if the response actually contains the kanji object.
    // Sometimes APIs might return success but have an error object inside.
    if (!data || data.error || !data.kanji) {
      return null;
    }

    return data as KanjiAliveDetails;
  } catch (error) {
    console.error('Failed to fetch kanji details from Kanji Alive:', error);
    return null;
  }
}
