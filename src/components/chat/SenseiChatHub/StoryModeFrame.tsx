import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { STORY_EPISODES, StoryStage } from '@/data/story-episodes';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Volume2, CheckCircle2, XCircle, ArrowLeft, MoreHorizontal, History, Sparkles, Zap, Heart } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const StoryModeFrame = () => {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { speak } = useTTS({ lang: 'ja-JP' });

  const episode = STORY_EPISODES.find(e => e.id === Number(episodeId));
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string; branch?: 'success' | 'correction' } | null>(null);
  
  // Premium State
  const [xp, setXp] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [userInput, setUserInput] = useState('');
  const [showIntervention, setShowIntervention] = useState(false);

  useEffect(() => {
    if (episode && currentStageIndex < episode.stages.length) {
      const stage = episode.stages[currentStageIndex];
      setHistory(prev => [...prev, stage.text]);
    }
  }, [currentStageIndex, episode]);

  if (!episode) return <div className="p-8 text-center text-[#fa4b84]/50">Episode not found</div>;

  const currentStage = episode.stages[currentStageIndex];
  const progress = ((currentStageIndex + 1) / episode.stages.length) * 100;

  const handleNext = () => {
    if (energy <= 0) {
      // Energy depletion logic
      setEnergy(3);
      setCurrentStageIndex(0); // Restart episode
      setFeedback(null);
      setIsAnswering(false);
      setShowIntervention(false);
      return;
    }

    if (currentStageIndex < episode.stages.length - 1) {
      setCurrentStageIndex(prev => prev + 1);
      setFeedback(null);
      setIsAnswering(false);
      setShowIntervention(false);
      setUserInput('');
    } else {
      navigate('/quiz/story');
    }
  };

  const handleChoice = (isCorrect: boolean, explanation: string) => {
    setIsAnswering(true);
    if (isCorrect) {
      setXp(prev => prev + 50);
      setFeedback({ isCorrect, message: explanation, branch: 'success' });
    } else {
      const newEnergy = Math.max(0, energy - 1);
      setEnergy(newEnergy);
      setFeedback({ 
        isCorrect, 
        message: newEnergy === 0 
          ? "Bạn đã hết năng lượng! Hãy bình tĩnh, Sensei sẽ giúp bạn ôn tập lại từ đầu." 
          : explanation, 
        branch: 'correction' 
      });

      // Log mistake to Supabase
      if (user && !isCorrect) {
        const mistakeWord = currentStage.question?.text || currentStage.text;
        (supabase as any).from('user_mistakes').upsert({
          user_id: user.id,
          word: mistakeWord,
          context: episode?.title + " - " + currentStage.text,
          last_mistake_at: new Date().toISOString()
        }, { onConflict: 'user_id,word' }).then(({ error }) => {
          if (error) console.error("Error logging mistake:", error);
        });
      }

      // Trigger intervention for wrong answers
      setTimeout(() => setShowIntervention(true), 1000);
    }
  };

  const handleInputSubmit = () => {
    const isCorrect = userInput.trim().toLowerCase() === currentStage.question?.text.trim().toLowerCase();
    handleChoice(isCorrect, currentStage.question?.explanation || '');
  };

  const getBackgroundUrl = () => {
    if (episodeId === '1') return "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=2070"; 
    if (episodeId === '2') return "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=2094"; 
    if (episodeId === '3') return "https://images.unsplash.com/photo-1526318896980-cf78c088247c?q=80&w=2070"; 
    if (episodeId === '4') return "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070"; 
    return "https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=2070";
  };

  return (
    <div className="relative min-h-screen bg-[#fdfbf9] overflow-hidden flex flex-col font-sans">
      {/* Cinematic Background Layer */}
      <AnimatePresence mode="wait">
        <motion.div
           key={currentStage.id}
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 1.2, ease: "easeOut" }}
           className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-white/20 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#fdfbf9] via-transparent to-white/40 z-10" />
          <img 
            src={getBackgroundUrl()} 
            alt="scenery" 
            className="w-full h-full object-cover grayscale-[0.1] contrast-100 opacity-90"
          />
        </motion.div>
      </AnimatePresence>

      {/* Bokeh / Particle Bloom */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#fa4b84]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-sky-100/30 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header UI */}
      <header className="relative z-50 p-6 flex items-center justify-between bg-gradient-to-b from-white/90 to-transparent">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/quiz/story')}
            className="text-[#2d1b24]/60 hover:text-[#fa4b84] hover:bg-[#fa4b84]/10 rounded-2xl"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <h2 className="text-[#2d1b24] font-black tracking-widest text-xs uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-[#fa4b84] rounded-full shadow-[0_0_8px_#fa4b84]" />
              {episode.title}
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-48 h-1.5 bg-[#f5eef0] rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-[#fa4b84] to-[#ffccd5] shadow-[0_0_10px_rgba(250,75,132,0.5)]"
                />
              </div>
              <span className="text-[10px] text-[#8c7a82] font-black tracking-widest uppercase">STAGE {currentStageIndex + 1}/{episode.stages.length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* XP & Energy Display */}
          <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-[#ffe4e9] shadow-sm">
             <div className="flex items-center gap-2 border-r border-[#ffe4e9] pr-4">
                <Zap className="h-4 w-4 text-[#fa4b84] fill-[#fa4b84]" />
                <span className="font-black text-sm text-[#1a1a1a]">{xp} XP</span>
             </div>
             <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    animate={i < energy ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ repeat: i < energy ? Infinity : 0, duration: 2 }}
                    className={cn(
                      "transition-all duration-500",
                      i < energy ? "text-[#fa4b84] fill-[#fa4b84] drop-shadow-[0_0_5px_rgba(250,75,132,0.5)]" : "text-[#f5eef0]"
                    )}
                  >
                    <Heart className="h-4 w-4" />
                  </motion.div>
                ))}
             </div>
          </div>

          <Button 
            variant="ghost" 
            className="text-[#2d1b24]/70 hover:text-[#fa4b84] bg-white/60 backdrop-blur-md rounded-2xl border border-[#ffe4e9]"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-4 w-4 mr-2" /> Nhật ký
          </Button>
        </div>
      </header>

      {/* Character Sprite Container */}
      <main className="relative flex-1 flex flex-col items-center justify-end pb-[420px] z-20">
        <AnimatePresence mode="wait">
          {currentStage.character && (
            <motion.div
              key={currentStage.character}
              initial={{ y: 100, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative w-[350px] md:w-[500px]"
            >
              {/* Character Glow Background */}
              <div className="absolute inset-0 bg-white/40 blur-[100px] rounded-full -z-10 animate-pulse" />
              
              <div className="relative aspect-[3/4] flex items-end justify-center">
                 <img 
                   src={`https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${currentStage.character}&backgroundColor=transparent`} 
                   alt={currentStage.character}
                   className="w-full h-full object-contain p-12 drop-shadow-[0_20px_40px_rgba(250,75,132,0.1)] transition-all duration-700 hover:scale-105"
                 />
                 <div className="absolute bottom-0 text-[180px] font-black text-[#fa4b84]/5 opacity-10 select-none tracking-tighter leading-none w-full text-center">
                   {currentStage.character.toUpperCase()}
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Dialogue UI (Sakura Milk Style) */}
      <footer className="fixed bottom-0 left-0 right-0 p-8 z-40 bg-gradient-to-t from-white via-white/80 to-transparent">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Level Hazard Indicator */}
          {currentStage.isHellMode && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative mx-auto flex justify-center mb-4"
            >
              <Badge className="bg-[#fa4b84] text-white border-none px-8 py-2 rounded-full font-black tracking-[0.4em] uppercase shadow-[0_10px_30px_rgba(250,75,132,0.4)] animate-pulse">
                Thử Thách: Cực Hạn
              </Badge>
            </motion.div>
          )}

          <div className="relative">
            {/* Dialogue Card (Cloud Glass) */}
            <Card className={cn(
              "relative overflow-hidden bg-white/70 backdrop-blur-[60px] border-[#ffe4e9] shadow-[0_30px_60px_rgba(250,75,132,0.1)] rounded-[40px] hover:border-[#fa4b84]/30 transition-all duration-500 ring-4 ring-white",
              currentStage.isHellMode && "ring-4 ring-[#fa4b84]/20 shadow-[0_0_50px_rgba(250,75,132,0.15)]"
            )}>
              {/* Colorful Edge Accent */}
              <div className={cn(
                "absolute top-0 bottom-0 left-0 w-2.5 bg-gradient-to-b",
                currentStage.isHellMode ? "from-red-400 to-[#fa4b84]" : "from-[#fa4b84] to-[#ffccd5]"
              )} />

              <CardContent className="p-10 pl-16 grid grid-cols-1 md:grid-cols-[1fr,auto] gap-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    {currentStage.character && (
                      <Badge className="bg-[#fa4b84]/10 text-[#fa4b84] border-none px-4 py-1 rounded-lg text-xs font-black tracking-widest uppercase">
                        {currentStage.character}
                      </Badge>
                    )}
                    <Badge variant="outline" className="border-sakura/20 text-sakura/60 text-[8px] px-2 py-0.5 rounded-md uppercase font-bold tracking-tighter">
                      Source: {currentStage.source || episode.source || "Notebook AI"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-2xl md:text-3xl font-bold text-[#1a1a1a] leading-snug tracking-tight">
                       <motion.span
                         key={currentStage.text}
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         transition={{ duration: 0.5 }}
                       >
                         {currentStage.text}
                       </motion.span>
                    </p>
                    
                    {currentStage.jpText && (
                      <div className="flex items-center gap-4 group">
                        <p className="text-xl md:text-2xl text-[#fa4b84] font-japanese font-black tracking-wide bg-[#fa4b84]/5 px-5 py-2.5 rounded-2xl border border-[#fa4b84]/10">
                          {currentStage.jpText}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => speak(currentStage.jpText!)}
                          className="h-12 w-12 rounded-full bg-white border border-[#ffe4e9] hover:bg-[#fa4b84] text-[#fa4b84] hover:text-white transition-all shadow-sm"
                        >
                          <Volume2 className="h-6 w-6" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-center md:justify-end pb-2">
                  {!currentStage.question && (
                    <Button 
                      onClick={handleNext}
                      className="group relative h-20 w-20 md:h-24 md:w-24 rounded-full bg-[#fa4b84] text-white p-0 overflow-hidden shadow-[0_15px_35px_rgba(250,75,132,0.4)] hover:bg-[#ff1a66] hover:scale-110 active:scale-90 transition-all duration-500"
                    >
                      <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                      <ChevronRight className="h-12 w-12 relative z-10" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quiz Choices or Input Overlay (Light Mode) */}
            <AnimatePresence>
              {currentStage.question && !isAnswering && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mt-8"
                >
                  {currentStage.question.type === 'choice' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentStage.question.options.map((option, idx) => (
                        <Button
                          key={idx}
                          onClick={() => handleChoice(option.isCorrect, currentStage.question!.explanation)}
                          className="h-20 rounded-[28px] bg-white border-2 border-[#f5eef0] hover:border-[#fa4b84] hover:bg-[#fa4b84]/5 text-[#1a1a1a] text-xl font-black tracking-tight transition-all duration-300 shadow-lg group/choice overflow-hidden"
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-0 bg-[#fa4b84]/10 group-hover/choice:w-full transition-all duration-500" />
                          <span className="relative z-10 flex items-center justify-between w-full px-8">
                             {option.text}
                             <Sparkles className="h-5 w-5 opacity-0 group-hover/choice:opacity-100 transition-opacity text-[#fa4b84]" />
                          </span>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 rounded-[40px] bg-white shadow-xl border-[#ffe4e9] ring-1 ring-[#fa4b84]/10">
                       <div className="space-y-6">
                          <label className="text-[10px] text-[#fa4b84] font-black uppercase tracking-[0.4em]">Kiểm tra nhập liệu</label>
                          <div className="relative">
                            <input 
                              autoFocus
                              type="text"
                              value={userInput}
                              onChange={(e) => setUserInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit()}
                              placeholder="Nhập câu trả lời bằng Romaji hoặc Hiragana..."
                              className="w-full h-20 bg-[#fdfbf9] border-2 border-[#f5eef0] rounded-[24px] px-8 text-2xl font-bold text-[#1a1a1a] focus:border-[#fa4b84] focus:ring-4 focus:ring-[#fa4b84]/5 outline-none transition-all"
                            />
                            <Button
                              onClick={handleInputSubmit}
                              className="absolute right-3 top-3 bottom-3 rounded-2xl bg-[#fa4b84] hover:bg-[#ff1a66] px-8 font-black uppercase tracking-widest text-xs"
                            >
                              Gửi <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                       </div>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sensei Intervention Overlay */}
            <AnimatePresence>
              {showIntervention && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="absolute -top-64 left-0 right-0 z-50 pointer-events-none"
                >
                  <div className="max-w-md mx-auto bg-white/95 backdrop-blur-xl border-2 border-[#fa4b84] p-8 rounded-[40px] shadow-[0_40px_80px_rgba(250,75,132,0.2)] pointer-events-auto">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#fa4b84] flex items-center justify-center text-white shadow-lg">
                           <Sparkles className="h-6 w-6" />
                        </div>
                        <div>
                           <p className="text-[10px] text-[#fa4b84] font-black uppercase tracking-widest">Sensei's Wisdom</p>
                           <p className="text-[#1a1a1a] font-black text-sm">Đừng lo lắng! Hãy nghe thầy giải thích.</p>
                        </div>
                     </div>
                     <p className="text-[#3c2f2f] text-lg leading-relaxed italic mb-6">
                        "{feedback?.message}"
                     </p>
                     <Button 
                       onClick={handleNext}
                       className="w-full h-14 rounded-2xl bg-[#fa4b84] text-white font-black uppercase tracking-widest text-xs hover:bg-[#ff1a66] transition-all"
                     >
                       Thử lại Stage này
                     </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feedback & Result View */}
            <AnimatePresence>
              {isAnswering && feedback && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <Card className={cn(
                    "rounded-[32px] border-none backdrop-blur-3xl p-8 relative overflow-hidden ring-4 ring-white",
                    feedback.isCorrect ? "bg-green-50 shadow-[0_20px_40px_rgba(34,197,94,0.12)]" : "bg-red-50 shadow-[0_20px_40px_rgba(239,68,68,0.12)]"
                  )}>
                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                      <div className={cn(
                        "h-20 w-20 rounded-full flex items-center justify-center border-[4px]",
                        feedback.isCorrect ? "bg-green-500 border-green-200 shadow-[0_10px_20px_rgba(34,197,94,0.3)]" : "bg-red-500 border-red-200 shadow-[0_10px_20px_rgba(239,68,68,0.3)]"
                      )}>
                        {feedback.isCorrect ? <CheckCircle2 className="h-10 w-10 text-white" /> : <XCircle className="h-10 w-10 text-white" />}
                      </div>
                      <div className="flex-1 space-y-2 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                          <p className={cn("text-2xl font-black uppercase tracking-widest", feedback.isCorrect ? "text-green-600" : "text-red-600")}>
                            {feedback.isCorrect ? "Thật Tuyệt Vời!" : "Cần Cố Gắng Hơn"}
                          </p>
                          {feedback.isCorrect && (
                            <motion.div 
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black"
                            >
                              +50 XP
                            </motion.div>
                          )}
                        </div>
                        <p className="text-[#3c2f2f] font-medium text-lg leading-relaxed">
                          {feedback.message}
                        </p>
                      </div>
                      <Button 
                        onClick={handleNext}
                        className={cn(
                          "px-10 h-14 rounded-2xl font-black uppercase tracking-[0.2em] transition-all text-white",
                          feedback.isCorrect ? "bg-green-500 hover:bg-green-600 shadow-[0_10px_20px_rgba(34,197,94,0.3)]" : "bg-red-500 hover:bg-red-600 shadow-[0_10px_20px_rgba(239,68,68,0.3)]"
                        )}
                      >
                        Tiếp tục <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </footer>

      {/* Narrative History Sidebar (Light) */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-[#2d1b24]/20 backdrop-blur-sm z-[100]"
              onClick={() => setShowHistory(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-[#ffe4e9] z-[101] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3 text-[#1a1a1a]">
                  <History className="text-[#fa4b84] h-6 w-6" /> Nhật ký
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} className="hover:bg-red-50">
                  <XCircle className="h-8 w-8 text-[#fa4b84]/40 hover:text-[#fa4b84]" />
                </Button>
              </div>
              <div className="space-y-6 overflow-y-auto h-[80vh] pr-4 custom-scrollbar">
                {history.map((text, i) => (
                  <div key={i} className="p-6 rounded-3xl bg-[#fdfbf9] border border-[#f5eef0] hover:border-[#fa4b84]/20 transition-all group">
                    <p className="text-[#fa4b84] text-[10px] font-black uppercase tracking-widest mb-2">Stage {i + 1}</p>
                    <p className="text-[#3c2f2f] text-lg leading-relaxed font-medium">{text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Aesthetic Overlay Noise */}
      <div className="fixed inset-0 pointer-events-none z-[60] opacity-[0.05] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
    </div>
  );
};
