import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Flashcards from "./pages/Flashcards";
import Quiz from "./pages/Quiz";
import Pronunciation from "./pages/Pronunciation";
import Vocabulary from "./pages/Vocabulary";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotFound from "./pages/NotFound";
import Reading from "./pages/Reading";
import SpeakingPractice from "./pages/SpeakingPractice";
import Achievements from "./pages/Achievements";
import VocabularyInput from "./pages/VocabularyInput";
import UserGuide from "./pages/UserGuide";
import VideoLearning from "./pages/VideoLearning";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/pronunciation" element={<Pronunciation />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/reading" element={<Reading />} />
            <Route path="/speaking-practice" element={<SpeakingPractice />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/vocabulary-input" element={<VocabularyInput />} />
            <Route path="/guide" element={<UserGuide />} />
            <Route path="/video-learning" element={<VideoLearning />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
