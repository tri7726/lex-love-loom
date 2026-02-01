import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SubtitleSegment {
  start: number;
  end: number;
  text: string;
}

// Parse transcript from innertube response
function parseTranscriptSegments(transcriptData: any): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  
  try {
    const actions = transcriptData?.actions?.[0]?.updateEngagementPanelAction?.content
      ?.transcriptRenderer?.content?.transcriptSearchPanelRenderer?.body
      ?.transcriptSegmentListRenderer?.initialSegments;
    
    if (!actions) {
      // Try alternative path
      const altActions = transcriptData?.actions;
      if (altActions) {
        for (const action of altActions) {
          const segments_data = action?.updateEngagementPanelAction?.content
            ?.transcriptRenderer?.body?.transcriptBodyRenderer?.cueGroups;
          
          if (segments_data) {
            for (const cueGroup of segments_data) {
              const cue = cueGroup?.transcriptCueGroupRenderer?.cues?.[0]?.transcriptCueRenderer;
              if (cue) {
                const startMs = parseInt(cue.startOffsetMs || '0');
                const durationMs = parseInt(cue.durationMs || '3000');
                const text = cue.cue?.simpleText || 
                  cue.cue?.runs?.map((r: any) => r.text).join('') || '';
                
                if (text.trim()) {
                  segments.push({
                    start: startMs / 1000,
                    end: (startMs + durationMs) / 1000,
                    text: text.trim()
                  });
                }
              }
            }
          }
        }
      }
    } else {
      for (const segment of actions) {
        const cue = segment?.transcriptSegmentRenderer;
        if (cue) {
          const startMs = parseInt(cue.startMs || '0');
          const endMs = parseInt(cue.endMs || startMs + 3000);
          const text = cue.snippet?.runs?.map((r: any) => r.text).join('') || '';
          
          if (text.trim()) {
            segments.push({
              start: startMs / 1000,
              end: endMs / 1000,
              text: text.trim()
            });
          }
        }
      }
    }
  } catch (e) {
    console.error('Error parsing transcript segments:', e);
  }
  
  return segments;
}

// Fetch using YouTube's innertube API
async function fetchWithInnertube(videoId: string): Promise<{
  title: string;
  captions: SubtitleSegment[];
  language: string;
} | null> {
  try {
    console.log('Trying innertube API for:', videoId);
    
    // First get the video page to extract required params
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      }
    });
    
    if (!pageResponse.ok) {
      console.log('Failed to fetch page');
      return null;
    }
    
    const html = await pageResponse.text();
    
    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : `Video ${videoId}`;
    
    // Try to find timedtext URL directly in the page
    const timedtextMatch = html.match(/"baseUrl":"(https:\/\/www\.youtube\.com\/api\/timedtext[^"]+)"/);
    
    if (timedtextMatch) {
      let captionUrl = timedtextMatch[1]
        .replace(/\\u0026/g, '&')
        .replace(/\\\//g, '/')
        .replace(/\\"/g, '"');
      
      console.log('Found timedtext URL, fetching...');
      
      // Try different formats
      for (const fmt of ['json3', 'srv3', '']) {
        let url = captionUrl;
        if (fmt) {
          url = url.replace(/fmt=[^&]+/, `fmt=${fmt}`);
          if (!url.includes('fmt=')) {
            url += `&fmt=${fmt}`;
          }
        }
        
        const captionResponse = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });
        
        if (captionResponse.ok) {
          const content = await captionResponse.text();
          console.log(`Format ${fmt || 'default'}: content length = ${content.length}`);
          
          if (content.length > 10) {
            const segments = parseContent(content);
            if (segments.length > 0) {
              console.log(`Parsed ${segments.length} segments with format ${fmt || 'default'}`);
              return { title, captions: segments, language: 'ja' };
            }
          }
        }
      }
    }
    
    // Fallback: Try to extract from ytInitialPlayerResponse
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
    if (playerResponseMatch) {
      try {
        const playerResponse = JSON.parse(playerResponseMatch[1]);
        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        
        if (captionTracks && captionTracks.length > 0) {
          console.log('Found caption tracks:', captionTracks.map((t: any) => t.languageCode));
          
          // Prefer Japanese
          const track = captionTracks.find((t: any) => t.languageCode === 'ja') || 
                       captionTracks.find((t: any) => t.languageCode?.startsWith('ja')) ||
                       captionTracks[0];
          
          let captionUrl = track.baseUrl.replace(/\\u0026/g, '&');
          
          // Try fetching with json3 format
          if (!captionUrl.includes('fmt=')) {
            captionUrl += '&fmt=json3';
          }
          
          console.log('Fetching caption from playerResponse URL...');
          
          const captionResponse = await fetch(captionUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': '*/*',
              'Referer': `https://www.youtube.com/watch?v=${videoId}`,
            }
          });
          
          if (captionResponse.ok) {
            const content = await captionResponse.text();
            console.log('Caption content length:', content.length);
            
            if (content.length > 10) {
              const segments = parseContent(content);
              if (segments.length > 0) {
                return { title, captions: segments, language: track.languageCode };
              }
            }
          }
        }
      } catch (e) {
        console.error('Error parsing playerResponse:', e);
      }
    }
    
    console.log('No captions found via any method');
    return null;
    
  } catch (error) {
    console.error('Innertube fetch error:', error);
    return null;
  }
}

// Parse content (JSON3 or XML format)
function parseContent(content: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  
  // Try JSON3 format first
  if (content.trim().startsWith('{')) {
    try {
      const data = JSON.parse(content);
      const events = data?.events || [];
      
      for (const event of events) {
        if (event.segs) {
          const text = event.segs
            .map((s: any) => s.utf8 || '')
            .join('')
            .replace(/\n/g, ' ')
            .trim();
          
          if (text && text !== '\n' && text.length > 0) {
            const startMs = event.tStartMs || 0;
            const durationMs = event.dDurationMs || 3000;
            
            segments.push({
              start: startMs / 1000,
              end: (startMs + durationMs) / 1000,
              text
            });
          }
        }
      }
      
      if (segments.length > 0) {
        console.log('Parsed JSON3 format:', segments.length, 'segments');
        return segments;
      }
    } catch (e) {
      console.log('Not valid JSON3, trying XML...');
    }
  }
  
  // Try XML format
  if (content.includes('<text')) {
    const regex = /<text[^>]*start="([\d.]+)"[^>]*dur="([\d.]+)"[^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/text>/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const start = parseFloat(match[1]);
      const dur = parseFloat(match[2]);
      let text = match[3]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
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
    
    if (segments.length > 0) {
      console.log('Parsed XML format:', segments.length, 'segments');
    }
  }
  
  return segments;
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

    const result = await fetchWithInnertube(youtube_id);

    if (!result || result.captions.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No captions available',
          message: 'Video này không có phụ đề CC tiếng Nhật hoặc YouTube đang chặn truy cập. Vui lòng tải SRT từ downsub.com và dán vào.',
          suggestion: 'Dùng https://downsub.com để tải file SRT'
        }),
        // IMPORTANT: return 200 so clients don't treat this as a transport error
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
