import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  PlayCircle,
  Plus,
  BookOpen,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Navigation from '@/components/Navigation';
import DictationPlayer from '@/components/DictationPlayer';
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

const VideoLearning = () => {
  const [videos, setVideos] = useState<VideoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoSource | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoSubtitles, setNewVideoSubtitles] = useState('');
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchVideos();
    }
  }, [user]);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_sources')
        .select('*')
        .eq('processed', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const parseSubtitles = (text: string): SubtitleEntry[] => {
    const lines = text.trim().split('\n');
    const subtitles: SubtitleEntry[] = [];
    let currentEntry: Partial<SubtitleEntry> = {};
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // SRT format: timestamp line
      const timeMatch = trimmed.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
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
        description: 'Không tìm thấy phụ đề hợp lệ. Vui lòng dán phụ đề SRT.',
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
      fetchVideos();
    } catch (error: any) {
      console.error('Error processing video:', error);
      toast({
        title: 'Lỗi xử lý video',
        description: error.message || 'Vui lòng thử lại sau',
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
      <Navigation />

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
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="video-url">Link YouTube</Label>
                  <Input
                    id="video-url"
                    placeholder="https://youtube.com/watch?v=..."
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                  />
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
                  <Label htmlFor="subtitles">
                    Phụ đề (định dạng SRT)
                  </Label>
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
                  />
                  <p className="text-xs text-muted-foreground">
                    Dán phụ đề tiếng Nhật của video. AI sẽ tự động phân tích từ vựng và ngữ pháp.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddVideo}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý với AI...
                    </>
                  ) : (
                    'Thêm & Xử lý Video'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Video List */}
        {videos.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chưa có video nào</h3>
              <p className="text-muted-foreground mb-4">
                Thêm video YouTube để bắt đầu luyện nghe chép
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm Video Đầu Tiên
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video, index) => (
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

export default VideoLearning;
