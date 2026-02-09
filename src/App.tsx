import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Flashcards from "./pages/Flashcards";
import FlashcardGames from "./pages/FlashcardGames";
import Quiz from "./pages/Quiz";
import Pronunciation from "./pages/Pronunciation";
import Vocabulary from "./pages/Vocabulary";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotFound from "./pages/NotFound";
import Reading from "./pages/Reading";
import SpeakingPractice from "./pages/SpeakingPractice";
import Achievements from "./pages/Achievements";
import UserGuide from "./pages/UserGuide";
import VideoLearning from "./pages/VideoLearning";
import Auth from "./pages/Auth";
import SavedVocabulary from "./pages/SavedVocabulary";
import ModuleManager from "./pages/ModuleManager";
import FolderManager from "./pages/FolderManager";
import FlashcardReview from "./pages/FlashcardReview";
import KanjiDetail from "./pages/KanjiDetail";

const queryClient = new QueryClient();

function App() {
  return (
    <React.Fragment>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/flashcards" element={<Flashcards />} />
                <Route path="/flashcard-games" element={<FlashcardGames />} />
                <Route path="/quiz" element={<Quiz />} />
                <Route path="/pronunciation" element={<Pronunciation />} />
                <Route path="/vocabulary" element={<Vocabulary />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/reading" element={<Reading />} />
                <Route path="/speaking-practice" element={<SpeakingPractice />} />
                <Route path="/achievements" element={<Achievements />} />
                <Route path="/guide" element={<UserGuide />} />
                <Route path="/video-learning" element={<VideoLearning />} />
                <Route path="/saved-vocabulary" element={<SavedVocabulary />} />
                <Route path="/module-manager" element={<ModuleManager />} />
                <Route path="/folder-manager" element={<FolderManager />} />
                <Route path="/flashcard-review" element={<FlashcardReview />} />
                <Route path="/kanji/:character" element={<KanjiDetail />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.Fragment>
  );
}

export default App;
