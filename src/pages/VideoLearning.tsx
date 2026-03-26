import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PlayCircle,
  Plus,
  BookOpen,
  Loader2,
  ChevronRight,
  Download,
  FileText,
  Sparkles,
  ExternalLink,
  Upload,
  Globe,
  Heart,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DictationPlayer } from '@/components/DictationPlayer';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VideoSource {
  id: string;
  youtube_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  jlpt_level: string;
  processed: boolean;
}

interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

// Helper function defined outside component to avoid hoisting issues
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

export const VideoLearning = () => {
  const [videos, setVideos] = useState<VideoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoSource | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [fetchingCaptions, setFetchingCaptions] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoSubtitles, setNewVideoSubtitles] = useState('');
  const [inputMode, setInputMode] = useState<'auto' | 'manual'>('auto');
  const [captionLanguage, setCaptionLanguage] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ja');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newVideoLevel, setNewVideoLevel] = useState<string>('N5');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // YouTube thumbnail from video URL
  const previewThumbnail = useMemo(() => {
    const youtubeId = extractYouTubeId(newVideoUrl);
    if (youtubeId) {
      return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    }
    return null;
  }, [newVideoUrl]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchVideos = useCallback(async () => {
    try {
      // Sử dụng view video_sources_public để ẩn trường created_by (bảo mật)
      const { data, error } = await supabase
        .from('video_sources_public')
        .select('id, youtube_id, title, description, duration, thumbnail_url, jlpt_level, processed, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('favorite_videos')
        .select('video_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavoriteIds(new Set(data?.map(f => f.video_id) || []));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchVideos();
      fetchFavorites();
    }
  }, [user, fetchVideos, fetchFavorites]);

  const toggleFavorite = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const isFavorite = favoriteIds.has(videoId);
    
    try {
      if (isFavorite) {
        await supabase
          .from('favorite_videos')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(videoId);
          return next;
        });
        toast({ title: 'Đã bỏ yêu thích' });
      } else {
        await supabase
          .from('favorite_videos')
          .insert({ user_id: user.id, video_id: videoId });
        
        setFavoriteIds(prev => new Set(prev).add(videoId));
        toast({ title: 'Đã thêm vào yêu thích' });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({ title: 'Lỗi', description: 'Không thể cập nhật yêu thích', variant: 'destructive' });
    }
  };

  // Filter videos by favorites + level + search
  const filteredVideos = useMemo(() => {
    let result = videos;
    if (showFavoritesOnly) result = result.filter(v => favoriteIds.has(v.id));
    if (levelFilter !== 'all') result = result.filter(v => v.jlpt_level === levelFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => v.title.toLowerCase().includes(q));
    }
    return result;
  }, [videos, favoriteIds, showFavoritesOnly, levelFilter, searchQuery]);


  const parseSubtitles = (text: string): SubtitleEntry[] => {
    const lines = text.trim().split('\n');
    const subtitles: SubtitleEntry[] = [];
    let currentEntry: Partial<SubtitleEntry> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // SRT format: timestamp line
      const timeMatch = trimmed.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
      if (timeMatch) {
        const parseTime = (t: string) => {
          const [h, m, s] = t.replace(',', '.').split(':');
          return parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
        };
        currentEntry.start = parseTime(timeMatch[1]);
        currentEntry.end = parseTime(timeMatch[2]);
        continue;
      }
      
      // Skip numeric lines (SRT index)
      if (/^\d+$/.test(trimmed)) continue;
      
      // Empty line = end of entry
      if (!trimmed) {
        if (currentEntry.start !== undefined && currentEntry.text) {
          subtitles.push(currentEntry as SubtitleEntry);
        }
        currentEntry = {};
        continue;
      }
      
      // Text line
      if (currentEntry.start !== undefined) {
        currentEntry.text = currentEntry.text 
          ? currentEntry.text + ' ' + trimmed 
          : trimmed;
      }
    }
    
    // Don't forget last entry
    if (currentEntry.start !== undefined && currentEntry.text) {
      subtitles.push(currentEntry as SubtitleEntry);
    }
    
    return subtitles;
  };

  // Auto-fetch captions from YouTube
  const handleFetchCaptions = async () => {
    const youtubeId = extractYouTubeId(newVideoUrl);
    if (!youtubeId) {
      toast({
        title: 'Lỗi',
        description: 'Link YouTube không hợp lệ',
        variant: 'destructive',
      });
      return;
    }

    setFetchingCaptions(true);
    setCaptionLanguage('');

    try {
      const { data, error } = await supabase.functions.invoke('fetch-youtube-captions', {
        body: { youtube_id: youtubeId, language: selectedLanguage }
      });

      // Transport / invocation error (network, CORS, non-2xx response, etc.)
      if (error) {
        console.error('Error fetching captions (invoke):', error);
        toast({
          title: 'Lỗi lấy phụ đề',
          description: error.message || 'Không thể lấy phụ đề từ YouTube',
          variant: 'destructive',
        });
        setInputMode('manual');
        return;
      }

      // Application-level failure returned as 200
      if (!data || data.success === false || data.error || !data.captions || data.captions.length === 0) {
        toast({
          title: 'Không thể lấy phụ đề tự động',
          description: (
            <div className="space-y-3">
              <p className="font-medium">{data?.message || 'Video này không có phụ đề CC hoặc YouTube đang chặn truy cập.'}</p>
              <div className="bg-muted/50 rounded-md p-2 text-sm space-y-1">
                <p className="font-semibold">📋 Cách tải phụ đề thủ công:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground">
                  <li>Mở link DownSub bên dưới</li>
                  <li>Chọn "Japanese" và tải file SRT</li>
                  <li>Mở file, copy nội dung và dán vào ô phụ đề</li>
                </ol>
              </div>
              <a 
                href={`https://downsub.com/?url=https://www.youtube.com/watch?v=${youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 bg-sakura text-white px-3 py-1.5 rounded-md hover:bg-sakura/90 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Mở DownSub.com
              </a>
            </div>
          ),
          variant: 'destructive',
          duration: 15000,
        });
        setInputMode('manual');
        return;
      }

      // Convert fetched captions to SRT format
      const srtContent = data.captions.map((cap: SubtitleEntry, idx: number) => {
        const formatTime = (seconds: number) => {
          const h = Math.floor(seconds / 3600);
          const m = Math.floor((seconds % 3600) / 60);
          const s = (seconds % 60).toFixed(3).replace('.', ',');
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.padStart(6, '0')}`;
        };
        return `${idx + 1}\n${formatTime(cap.start)} --> ${formatTime(cap.end)}\n${cap.text}\n`;
      }).join('\n');

      setNewVideoSubtitles(srtContent);
      setNewVideoTitle(data.title || '');
      setCaptionLanguage(data.language);

      toast({
        title: 'Lấy phụ đề thành công!',
        description: `Đã lấy ${data.segments_count} đoạn phụ đề (${data.language})`,
      });

      } catch (error: unknown) {
      console.error('Error fetching captions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể lấy phụ đề từ YouTube';
      toast({
        title: 'Lỗi lấy phụ đề',
        description: errorMessage,
        variant: 'destructive',
      });
      setInputMode('manual');
    } finally {
      setFetchingCaptions(false);
    }
  };

  const handleAddVideo = async () => {
    const youtubeId = extractYouTubeId(newVideoUrl);
    if (!youtubeId) {
      toast({
        title: 'Lỗi',
        description: 'Link YouTube không hợp lệ',
        variant: 'destructive',
      });
      return;
    }

    if (!newVideoTitle.trim()) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng nhập tiêu đề video',
        variant: 'destructive',
      });
      return;
    }

    const subtitles = parseSubtitles(newVideoSubtitles);
    if (subtitles.length === 0) {
      toast({
        title: 'Lỗi',
        description: 'Không tìm thấy phụ đề hợp lệ. Vui lòng dán phụ đề SRT hoặc lấy từ YouTube.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      const response = await supabase.functions.invoke('process-video', {
        body: {
          youtube_id: youtubeId,
          title: newVideoTitle,
          subtitles,
          jlpt_level: newVideoLevel,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: 'Thành công!',
        description: `Đã xử lý ${response.data.segments_count} đoạn video`,
      });

      setAddDialogOpen(false);
      setNewVideoUrl('');
      setNewVideoTitle('');
      setNewVideoSubtitles('');
      setCaptionLanguage('');
      fetchVideos();
    } catch (error: unknown) {
      console.error('Error processing video:', error);
      const errorMessage = error instanceof Error ? error.message : 'Vui lòng thử lại sau';
      toast({
        title: 'Lỗi xử lý video',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedVideo) {
    return (
      <DictationPlayer
        video={selectedVideo}
        onBack={() => setSelectedVideo(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <PlayCircle className="h-8 w-8 text-sakura" />
              Video Dictation
            </h1>
            <p className="text-muted-foreground">
              Luyện nghe chép tiếng Nhật qua video YouTube
            </p>
          </div>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm Video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Thêm Video Mới</DialogTitle>
                <DialogDescription>
                  Lấy phụ đề tự động từ YouTube hoặc dán phụ đề SRT thủ công
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Thumbnail Preview */}
                {previewThumbnail && (
                  <div className="rounded-lg overflow-hidden border bg-muted/30">
                    <img 
                      src={previewThumbnail} 
                      alt="Video thumbnail" 
                      className="w-full aspect-video object-cover"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="video-url">Link YouTube</Label>
                  <div className="flex gap-2">
                    <Input
                      id="video-url"
                      placeholder="https://youtube.com/watch?v=..."
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger className="w-24 shrink-0">
                        <Globe className="h-4 w-4 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ja">🇯🇵 日本語</SelectItem>
                        <SelectItem value="en">🇬🇧 English</SelectItem>
                        <SelectItem value="auto">🌐 Auto</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={handleFetchCaptions}
                      disabled={fetchingCaptions || !newVideoUrl}
                      className="gap-1 shrink-0"
                    >
                      {fetchingCaptions ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Lấy CC
                    </Button>
                  </div>
                  {captionLanguage && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Phụ đề: {captionLanguage}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="video-title">Tiêu đề</Label>
                  <Input
                    id="video-title"
                    placeholder="Ví dụ: N5 Listening Practice #1"
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Trình độ JLPT</Label>
                  <Select value={newVideoLevel} onValueChange={setNewVideoLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trình độ" />
                    </SelectTrigger>
                    <SelectContent>
                      {['N5', 'N4', 'N3', 'N2', 'N1'].map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subtitles">Phụ đề (SRT)</Label>
                    {newVideoSubtitles && (
                      <Badge variant="outline" className="text-xs">
                        {parseSubtitles(newVideoSubtitles).length} đoạn
                      </Badge>
                    )}
                  </div>
                  <Textarea
                    id="subtitles"
                    placeholder={`1
00:00:01,000 --> 00:00:05,000
こんにちは

2
00:00:06,000 --> 00:00:10,000
私は田中です`}
                    rows={8}
                    value={newVideoSubtitles}
                    onChange={(e) => setNewVideoSubtitles(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".srt,.vtt,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            setNewVideoSubtitles(content);
                            toast({
                              title: 'File đã tải',
                              description: `Đã tải ${file.name}`,
                            });
                          };
                          reader.readAsText(file);
                        }
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-3 w-3" />
                      Tải file SRT
                    </Button>
                    <span className="text-muted-foreground">hoặc</span>
                    {newVideoUrl && extractYouTubeId(newVideoUrl) && (
                      <a 
                        href={`https://downsub.com/?url=https://www.youtube.com/watch?v=${extractYouTubeId(newVideoUrl)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sakura hover:underline flex items-center gap-1"
                      >
                        Tải từ DownSub <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleAddVideo}
                  disabled={processing || !newVideoSubtitles}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xử lý với AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Thêm & Xử lý Video
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        {videos.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm video..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 h-9 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Level filter */}
            <div className="flex bg-muted rounded-xl p-1 gap-0.5">
              {['all', 'N5', 'N4', 'N3', 'N2', 'N1'].map(l => (
                <button key={l}
                  onClick={() => setLevelFilter(l)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    levelFilter === l ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {l === 'all' ? 'Tất cả' : l}
                </button>
              ))}
            </div>

            {/* Favorites */}
            <Button
              variant={showFavoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Yêu thích ({favoriteIds.size})
            </Button>
          </div>
        )}

        {/* Video List */}
        {filteredVideos.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {showFavoritesOnly ? 'Chưa có video yêu thích' : 'Chưa có video nào'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {showFavoritesOnly 
                  ? 'Bấm vào icon trái tim để thêm video vào danh sách yêu thích'
                  : 'Thêm video YouTube để bắt đầu luyện nghe chép'
                }
              </p>
              {!showFavoritesOnly && (
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm Video Đầu Tiên
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="shadow-card hover:shadow-elevated transition-all cursor-pointer group overflow-hidden"
                  onClick={() => setSelectedVideo(video)}
                >
                  <div className="aspect-video bg-gradient-to-br from-sakura/10 to-gold/10 relative">
                    {video.thumbnail_url && (
                      <img
                        src={video.thumbnail_url}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="h-12 w-12 text-primary" />
                    </div>
                    {/* Favorite button */}
                    <button
                      onClick={(e) => toggleFavorite(video.id, e)}
                      className="absolute top-2 right-2 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
                    >
                      <Heart 
                        className={`h-5 w-5 transition-colors ${
                          favoriteIds.has(video.id) 
                            ? 'fill-red-500 text-red-500' 
                            : 'text-muted-foreground hover:text-red-500'
                        }`} 
                      />
                    </button>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2">{video.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-sakura/10 text-sakura">
                        {video.jlpt_level}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

// export default VideoLearning;
