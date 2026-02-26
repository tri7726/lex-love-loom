import React from 'react';
import { motion } from 'framer-motion';
import { Video, Headphones, Mic, Brain, FileText } from 'lucide-react';

export type VideoTab = 'video' | 'dictation' | 'pronunciation' | 'quiz' | 'summary';

interface VideoLearningTabsProps {
  activeTab: VideoTab;
  onTabChange: (tab: VideoTab) => void;
  quizCount?: number;
  segmentsCount?: number;
}

const tabs: Array<{ id: VideoTab; label: string; icon: React.ElementType }> = [
  { id: 'video', label: 'Video', icon: Video },
  { id: 'dictation', label: 'Chép chính tả', icon: Headphones },
  { id: 'pronunciation', label: 'Phát âm', icon: Mic },
  { id: 'quiz', label: 'Bài tập', icon: Brain },
  { id: 'summary', label: 'Tóm tắt', icon: FileText },
];

export const VideoLearningTabs: React.FC<VideoLearningTabsProps> = ({
  activeTab,
  onTabChange,
  quizCount = 0,
  segmentsCount = 0,
}) => {
  return (
    <div className="flex items-center justify-start sm:justify-center gap-1 sm:gap-2 py-3 px-4 bg-background border-b sticky top-0 z-20 overflow-x-auto no-scrollbar whitespace-nowrap">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        let count = 0;
        if (tab.id === 'quiz') count = quizCount;
        if (tab.id === 'dictation' || tab.id === 'pronunciation' || tab.id === 'video') count = segmentsCount;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-sm font-medium
              transition-all duration-200 flex-shrink-0
              ${isActive 
                ? 'text-white' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }
            `}
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-matcha to-matcha/80 rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-muted-foreground/10'}`}>
                  {count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// export default VideoLearningTabs;
