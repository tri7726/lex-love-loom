import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { FuriganaProvider } from "@/contexts/FuriganaContext";
import { AIProvider } from "@/contexts/AIContext";
import { Index } from "./pages/Index";
import { Quiz } from "./pages/Quiz";
import { Vocabulary } from "./pages/Vocabulary";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { NotFound } from "./pages/NotFound";
import { Reading } from "./pages/Reading";
import { SpeakingPractice } from "./pages/SpeakingPractice";
import { Achievements } from "./pages/Achievements";
import { UserGuide } from "./pages/UserGuide";
import { VideoLearning } from "./pages/VideoLearning";
import { Auth } from "./pages/Auth";
import { ModuleManager } from "./pages/ModuleManager";
import { FolderManager } from "./pages/FolderManager";
import { KanjiDetail } from "./pages/KanjiDetail";
import { AITutor } from "./pages/AITutor";
import { JLPTPortal } from "./pages/JLPTPortal";
import { JLPTLevelDetail } from "./pages/JLPTLevelDetail";
import { GrammarWiki } from "./pages/GrammarWiki";
import { MockTestCenter } from "./pages/MockTestCenter";
import { UnitContent } from "./pages/UnitContent";
import { JLPTMockExam } from "./pages/JLPTMockExam";
import { KanjiWorksheet } from "./pages/KanjiWorksheet";
import { AIRoleplay } from "./pages/AIRoleplay";
import { News } from "./pages/News";
import { Squads } from "./pages/Squads";
import { Challenges } from "./pages/Challenges";
import { Friends } from "./pages/Friends";
import { UserProfile } from "./pages/UserProfile";
import { EditProfile } from "./pages/EditProfile";
import { Messages } from "./pages/Messages";
import { Leagues } from "./pages/Leagues";
import Flashcards from "./pages/Flashcards";
import { FlashcardReview } from "./pages/FlashcardReview";
import { FlashcardGames } from "./pages/FlashcardGames";
import Pronunciation from "./pages/Pronunciation";
import { AdminImport } from "./pages/AdminImport";
import { StoryMode } from "./pages/StoryMode";
import { StoryModeFrame } from "./components/chat/SenseiChatHub/StoryModeFrame";

const queryClient = new QueryClient();

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
