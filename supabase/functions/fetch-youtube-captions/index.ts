import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptionTrack {
  baseUrl: string;
  name: { simpleText: string };
  languageCode: string;
}

interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

// Parse XML captions to subtitle segments
function parseXMLCaptions(xml: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  
  // Match <text start="X" dur="Y">content</text>
  const regex = /<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]*)<\/text>/g;
  let match;
  
  while ((match = regex.exec(xml)) !== null) {
    const start = parseFloat(match[1]);
    const dur = parseFloat(match[2]);
    let text = match[3];
    
    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n/g, ' ')
      .trim();
    
    if (text) {
      segments.push({
        start,
        end: start + dur,
        text
      });
    }
  }
  
  return segments;
}

// Extract video info and captions from YouTube
async function getYouTubeCaptions(videoId: string): Promise<{
  title: string;
  captions: SubtitleSegment[];
  language: string;
} | null> {
  try {
    console.log('Fetching YouTube page for:', videoId);
    
    // Fetch the YouTube video page
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'ja,en;q=0.9',
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch YouTube page:', response.status);
      return null;
    }
    
    const html = await response.text();
    
    // Extract video title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    let title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : `Video ${videoId}`;
    
    // Find captions data in the page
    const captionsMatch = html.match(/"captions":\s*(\{[^}]+\})/);
    if (!captionsMatch) {
      // Try alternative pattern
      const altMatch = html.match(/playerCaptionsTracklistRenderer.*?"captionTracks":\s*(\[[^\]]+\])/);
      if (!altMatch) {
        console.log('No captions found in page');
        return null;
      }
    }
    
    // Extract caption tracks
    const tracksMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/);
    if (!tracksMatch) {
      console.log('No caption tracks found');
      return null;
    }
    
    let tracks: CaptionTrack[];
    try {
      // Clean and parse JSON
      const tracksJson = tracksMatch[1].replace(/\\u0026/g, '&').replace(/\\"/g, '"');
      tracks = JSON.parse(tracksJson);
    } catch (e) {
      console.error('Failed to parse caption tracks:', e);
      return null;
    }
    
    if (!tracks || tracks.length === 0) {
      console.log('No caption tracks available');
      return null;
    }
    
    console.log('Found caption tracks:', tracks.map(t => t.languageCode));
    
    // Prefer Japanese captions, fallback to first available
    let selectedTrack = tracks.find(t => t.languageCode === 'ja') || 
                        tracks.find(t => t.languageCode.startsWith('ja')) ||
                        tracks[0];
    
    console.log('Selected track:', selectedTrack.languageCode);
    
    // Fetch the caption content
    const captionUrl = selectedTrack.baseUrl.replace(/\\u0026/g, '&');
    console.log('Fetching captions from:', captionUrl.substring(0, 100) + '...');
    
    const captionResponse = await fetch(captionUrl);
    if (!captionResponse.ok) {
      console.error('Failed to fetch captions:', captionResponse.status);
      return null;
    }
    
    const captionXml = await captionResponse.text();
    const captions = parseXMLCaptions(captionXml);
    
    console.log('Parsed', captions.length, 'caption segments');
    
    return {
      title,
      captions,
      language: selectedTrack.languageCode
    };
  } catch (error) {
    console.error('Error fetching YouTube captions:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { youtube_id } = await req.json();

    if (!youtube_id) {
      return new Response(
        JSON.stringify({ error: 'youtube_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching captions for YouTube video:', youtube_id);

    const result = await getYouTubeCaptions(youtube_id);

    if (!result) {
      return new Response(
        JSON.stringify({ 
          error: 'No captions available',
          message: 'Video này không có phụ đề CC hoặc không thể truy cập được.'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully fetched captions:', result.captions.length, 'segments');

    return new Response(
      JSON.stringify({
        success: true,
        title: result.title,
        language: result.language,
        captions: result.captions,
        segments_count: result.captions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-youtube-captions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
