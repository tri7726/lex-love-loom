import React from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Pause, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';

const VideoLearning = () => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  const videos = [
    {
      id: '1',
      title: 'Basic Greetings',
      titleJp: '基本の挨拶',
      duration: '5:30',
      level: 'N5',
      thumbnail: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400',
    },
    {
      id: '2',
      title: 'Self Introduction',
      titleJp: '自己紹介',
      duration: '7:15',
      level: 'N5',
      thumbnail: 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=400',
    },
    {
      id: '3',
      title: 'Ordering Food',
      titleJp: '食べ物の注文',
      duration: '8:45',
      level: 'N4',
      thumbnail: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=400',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
            <PlayCircle className="h-8 w-8 text-sakura" />
            Video Learning
          </h1>
          <p className="text-muted-foreground">
            Learn Japanese through video lessons
          </p>
        </div>

        {/* Featured Video */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-elevated overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-sakura/20 to-gold/20 flex items-center justify-center relative">
              <img
                src={videos[0].thumbnail}
                alt={videos[0].title}
                className="absolute inset-0 w-full h-full object-cover opacity-50"
              />
              <Button
                size="lg"
                className="relative z-10 gap-2 rounded-full h-16 w-16"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" />
                ) : (
                  <PlayCircle className="h-8 w-8" />
                )}
              </Button>
            </div>
            <CardContent className="p-6">
              <h2 className="text-2xl font-display font-bold">{videos[0].titleJp}</h2>
              <p className="text-muted-foreground">{videos[0].title}</p>
              <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                <span>{videos[0].duration}</span>
                <span className="px-2 py-1 rounded bg-sakura/10 text-sakura">
                  {videos[0].level}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Video List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.slice(1).map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="shadow-card hover:shadow-elevated transition-shadow cursor-pointer overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-sakura/10 to-gold/10 relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-background/30 opacity-0 hover:opacity-100 transition-opacity">
                    <PlayCircle className="h-12 w-12 text-primary-foreground" />
                  </div>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-jp font-semibold">{video.titleJp}</h3>
                  <p className="text-sm text-muted-foreground">{video.title}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{video.duration}</span>
                    <span className="px-2 py-0.5 rounded bg-sakura/10 text-sakura">
                      {video.level}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default VideoLearning;
