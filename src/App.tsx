import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { FuriganaProvider } from "@/contexts/FuriganaContext";
import { AIProvider } from "@/contexts/AIContext";

// Critical pages loaded eagerly
import { Index } from "./pages/Index";
import { Auth } from "./pages/Auth";
import { NotFound } from "./pages/NotFound";

// All other pages lazy-loaded
const Quiz = React.lazy(() => import("./pages/Quiz").then(m => ({ default: m.Quiz })));
const Vocabulary = React.lazy(() => import("./pages/Vocabulary").then(m => ({ default: m.Vocabulary })));
const LeaderboardPage = React.lazy(() => import("./pages/LeaderboardPage").then(m => ({ default: m.LeaderboardPage })));
const Reading = React.lazy(() => import("./pages/Reading").then(m => ({ default: m.Reading })));
const SpeakingPractice = React.lazy(() => import("./pages/SpeakingPractice").then(m => ({ default: m.SpeakingPractice })));
const Achievements = React.lazy(() => import("./pages/Achievements").then(m => ({ default: m.Achievements })));
const UserGuide = React.lazy(() => import("./pages/UserGuide").then(m => ({ default: m.UserGuide })));
const VideoLearning = React.lazy(() => import("./pages/VideoLearning").then(m => ({ default: m.VideoLearning })));
const ModuleManager = React.lazy(() => import("./pages/ModuleManager").then(m => ({ default: m.ModuleManager })));
const FolderManager = React.lazy(() => import("./pages/FolderManager").then(m => ({ default: m.FolderManager })));
const KanjiDetail = React.lazy(() => import("./pages/KanjiDetail").then(m => ({ default: m.KanjiDetail })));
const AITutor = React.lazy(() => import("./pages/AITutor").then(m => ({ default: m.AITutor })));
const JLPTPortal = React.lazy(() => import("./pages/JLPTPortal").then(m => ({ default: m.JLPTPortal })));
const JLPTLevelDetail = React.lazy(() => import("./pages/JLPTLevelDetail").then(m => ({ default: m.JLPTLevelDetail })));
const GrammarWiki = React.lazy(() => import("./pages/GrammarWiki").then(m => ({ default: m.GrammarWiki })));
const MockTestCenter = React.lazy(() => import("./pages/MockTestCenter").then(m => ({ default: m.MockTestCenter })));
const UnitContent = React.lazy(() => import("./pages/UnitContent").then(m => ({ default: m.UnitContent })));
const JLPTMockExam = React.lazy(() => import("./pages/JLPTMockExam").then(m => ({ default: m.JLPTMockExam })));
const KanjiWorksheet = React.lazy(() => import("./pages/KanjiWorksheet").then(m => ({ default: m.KanjiWorksheet })));
const AIRoleplay = React.lazy(() => import("./pages/AIRoleplay").then(m => ({ default: m.AIRoleplay })));
const News = React.lazy(() => import("./pages/News").then(m => ({ default: m.News })));
const Squads = React.lazy(() => import("./pages/Squads").then(m => ({ default: m.Squads })));
const Challenges = React.lazy(() => import("./pages/Challenges").then(m => ({ default: m.Challenges })));
const Friends = React.lazy(() => import("./pages/Friends").then(m => ({ default: m.Friends })));
const UserProfile = React.lazy(() => import("./pages/UserProfile").then(m => ({ default: m.UserProfile })));
const EditProfile = React.lazy(() => import("./pages/EditProfile").then(m => ({ default: m.EditProfile })));
const Messages = React.lazy(() => import("./pages/Messages").then(m => ({ default: m.Messages })));
const Leagues = React.lazy(() => import("./pages/Leagues").then(m => ({ default: m.Leagues })));
const Flashcards = React.lazy(() => import("./pages/Flashcards"));
const FlashcardReview = React.lazy(() => import("./pages/FlashcardReview").then(m => ({ default: m.FlashcardReview })));
const FlashcardGames = React.lazy(() => import("./pages/FlashcardGames").then(m => ({ default: m.FlashcardGames })));
const Pronunciation = React.lazy(() => import("./pages/Pronunciation"));
const AdminImport = React.lazy(() => import("./pages/AdminImport").then(m => ({ default: m.AdminImport })));
const StoryMode = React.lazy(() => import("./pages/StoryMode").then(m => ({ default: m.StoryMode })));
const StoryModeFrame = React.lazy(() => import("./components/chat/SenseiChatHub/StoryModeFrame").then(m => ({ default: m.StoryModeFrame })));
const SenseiHub = React.lazy(() => import("./pages/SenseiHub"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">読み込み中...</p>
    </div>
  </div>
);

function App() {
  return (
    <React.Fragment>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <FuriganaProvider>
              <AIProvider>
                <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/quiz" element={<Quiz />} />
                      <Route path="/vocabulary" element={<Vocabulary />} />
                      <Route path="/leaderboard" element={<LeaderboardPage />} />
                      <Route path="/reading" element={<Reading />} />
                      <Route path="/speaking-practice" element={<SpeakingPractice />} />
                      <Route path="/achievements" element={<Achievements />} />
                      <Route path="/guide" element={<UserGuide />} />
                      <Route path="/video-learning" element={<VideoLearning />} />
                      <Route path="/module-manager" element={<ModuleManager />} />
                      <Route path="/folder-manager" element={<FolderManager />} />
                      <Route path="/kanji/:character" element={<KanjiDetail />} />
                      <Route path="/ai-tutor" element={<AITutor />} />
                      <Route path="/sensei" element={<SenseiHub />} />
                      <Route path="/learning-path" element={<JLPTPortal />} />
                      <Route path="/learning-path/:level" element={<JLPTLevelDetail />} />
                      <Route path="/grammar" element={<GrammarWiki />} />
                      <Route path="/mock-tests" element={<MockTestCenter />} />
                      <Route path="/learning-path/:level/unit/:unitId" element={<UnitContent />} />
                      <Route path="/mock-exam/:examId" element={<JLPTMockExam />} />
                      <Route path="/kanji-worksheet" element={<KanjiWorksheet />} />
                      <Route path="/roleplay" element={<AIRoleplay />} />
                      <Route path="/news" element={<News />} />
                      <Route path="/squads" element={<Squads />} />
                      <Route path="/challenges" element={<Challenges />} />
                      <Route path="/friends" element={<Friends />} />
                      <Route path="/profile/:userId" element={<UserProfile />} />
                      <Route path="/edit-profile" element={<EditProfile />} />
                      <Route path="/messages" element={<Messages />} />
                      <Route path="/leagues" element={<Leagues />} />
                      <Route path="/flashcards" element={<Flashcards />} />
                      <Route path="/flashcard-review" element={<FlashcardReview />} />
                      <Route path="/flashcard-games" element={<FlashcardGames />} />
                      <Route path="/pronunciation" element={<Pronunciation />} />
                      <Route path="/admin/import" element={<AdminImport />} />
                      <Route path="/quiz/story" element={<StoryMode />} />
                      <Route path="/quiz/story/:episodeId" element={<StoryModeFrame />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </TooltipProvider>
            </AIProvider>
          </FuriganaProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.Fragment>
  );
}

export default App;
