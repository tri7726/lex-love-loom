import React from 'react';
import { motion } from 'framer-motion';
import { Brain, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

interface DueCard {
  id: string;
  word: string;
  reading: string;
  meaning: string;
}

interface ReviewPreviewProps {
  dueCards: DueCard[];
  dueCount: number;
  loadingDue?: boolean;
}

export const ReviewPreview: React.FC<ReviewPreviewProps> = ({ dueCards, dueCount, loadingDue }) => {
  const navigate = useNavigate();

  if (dueCards.length === 0) return null;

  return (
    <motion.section
      variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Brain className="h-5 w-5 text-sakura" />
          Thẻ tới hạn ({dueCount})
        </h2>
        <Link to="/review">
          <Button variant="ghost" size="sm" className="text-sakura font-bold text-xs uppercase tracking-widest gap-1">
            Bắt đầu Ôn ngay <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {dueCards.map((card) => (
          <Card
            key={card.id}
            className="border-sakura/20 bg-sakura-light/5 hover:bg-sakura/5 transition-colors cursor-pointer group"
            onClick={() => navigate('/vocabulary')}
          >
            <CardContent className="p-4 text-center space-y-1">
              <p className="font-jp text-lg font-bold group-hover:text-sakura transition-colors">{card.word}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-1">{card.meaning}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.section>
  );
};
