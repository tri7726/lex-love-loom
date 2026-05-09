/**
 * Kanji Handwriting Recognition Utility
 * Uses Google Input Tools Handwriting API
 */

export const recognizeHandwriting = async (strokes: number[][][]): Promise<string[]> => {
  try {
    const response = await fetch(
      'https://www.google.com.tw/inputtools/request?ime=handwriting&app=autofill&maxresults=10&out=json&itc=ja-t-i0-handwrit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app: 'autofill',
          enable_pre_selection: true,
          ime: 'handwriting',
          ink: strokes,
          itc: 'ja-t-i0-handwrit',
          languages: ['ja'],
          max_results: 10,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Recognition API failed');
    }

    const data = await response.json();
    
    // Google API returns [ "SUCCESS", [ [ "match1", "match2", ... ] ] ]
    if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1]) {
      return data[1][0][1];
    }
    
    return [];
  } catch (error) {
    console.error('Handwriting Recognition Error:', error);
    return [];
  }
};
