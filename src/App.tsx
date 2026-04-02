import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileProvider } from "@/hooks/useProfile";
import { ThemeProvider } from "@/hooks/useTheme";
import { FuriganaProvider } from "@/contexts/FuriganaContext";
import { AIProvider } from "@/contexts/AIContext";
import { WritingLabProvider } from "@/contexts/WritingLabContext";
import { ConfettiProvider } from "@/components/ConfettiProvider";
import { LevelUpModal } from "@/components/effects/LevelUpModal";
import { AppLayout } from "./components/layout/AppLayout";
import { Index } from "./pages/Index";

// Lazy-loaded pages
const Vocabulary = React.lazy(() => import("./pages/Vocabulary").then(m => ({ default: m.Vocabulary })));
const SavedVocabulary = React.lazy(() => import("./pages/SavedVocabulary"));
const Auth = React.lazy(() => import("./pages/Auth").then(m => ({ default: m.Auth })));
const NotFound = React.lazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));
const EditProfile = React.lazy(() => import("./pages/EditProfile").then(m => ({ default: m.EditProfile })));
const UserProfile = React.lazy(() => import("./pages/UserProfile").then(m => ({ default: m.UserProfile })));
const Leagues = React.lazy(() => import("./pages/Leagues").then(m => ({ default: m.Leagues })));
const LeaderboardPage = React.lazy(() => import("./pages/LeaderboardPage"));
const Friends = React.lazy(() => import("./pages/Friends").then(m => ({ default: m.Friends })));
const Challenges = React.lazy(() => import("./pages/Challenges").then(m => ({ default: m.Challenges })));
const Messages = React.lazy(() => import("./pages/Messages").then(m => ({ default: m.Messages })));
const Squads = React.lazy(() => import("./pages/Squads").then(m => ({ default: m.Squads })));
const JLPTPortal = React.lazy(() => import("./pages/JLPTPortal").then(m => ({ default: m.JLPTPortal })));
const JLPTLevelDetail = React.lazy(() => import("./pages/JLPTLevelDetail").then(m => ({ default: m.JLPTLevelDetail })));
const MockTestCenter = React.lazy(() => import("./pages/MockTestCenter").then(m => ({ default: m.MockTestCenter })));
const JLPTMockExam = React.lazy(() => import("./pages/JLPTMockExam").then(m => ({ default: m.JLPTMockExam })));
const GrammarWiki = React.lazy(() => import("./pages/GrammarWiki").then(m => ({ default: m.GrammarWiki })));
const Reading = React.lazy(() => import("./pages/Reading").then(m => ({ default: m.Reading })));
const VideoLearning = React.lazy(() => import("./pages/VideoLearning").then(m => ({ default: m.VideoLearning })));
const KanjiDetail = React.lazy(() => import("./pages/KanjiDetail").then(m => ({ default: m.KanjiDetail })));
const KanjiWorksheet = React.lazy(() => import("./pages/KanjiWorksheet").then(m => ({ default: m.KanjiWorksheet })));
const UnitContent = React.lazy(() => import("./pages/UnitContent").then(m => ({ default: m.UnitContent })));
const ModuleManager = React.lazy(() => import("./pages/ModuleManager").then(m => ({ default: m.ModuleManager })));

// Pages with mixed export styles (standardized below)
const AdminImport = React.lazy(() => import("./pages/AdminImport").then(m => ({ default: m.AdminImport })));
const StoryMode = React.lazy(() => import("./pages/StoryMode").then(m => ({ default: m.StoryMode })));
const StoryModeFrame = React.lazy(() => import("./components/chat/SenseiChatHub/StoryModeFrame").then(m => ({ default: m.StoryModeFrame })));
const AdminExamManager = React.lazy(() => import("./pages/AdminExamManager").then(m => ({ default: m.AdminExamManager })));

// Default exports
const SenseiHub = React.lazy(() => import("./pages/SenseiHub"));
const PvPBattle = React.lazy(() => import("./pages/PvPBattle"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const QuickMode = React.lazy(() => import("./pages/QuickMode"));
const CommunityDecks = React.lazy(() => import("./pages/CommunityDecks"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-sakura/20 border-t-sakura animate-spin" />
      <p className="text-sm text-muted-foreground">読み込み中...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConfettiProvider>
      <AuthProvider>
        <ProfileProvider>
          <ThemeProvider>
            <FuriganaProvider>
              <AIProvider>
                <WritingLabProvider>
                  <TooltipProvider>
                    <BrowserRouter>
                      <Suspense fallback={<PageLoader />}>
                        <LevelUpModal />
                        <Routes>
                          {/* Standalone Pages (No global navigation) */}
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/quick-mode" element={<QuickMode />} />
                          <Route path="/quiz/story/:episodeId" element={<StoryModeFrame />} />
                          <Route path="/pvp/:challengeId" element={<PvPBattle />} />

                          {/* Pages wrapped in AppLayout (With navigation) */}
                          <Route element={<AppLayout />}>
                            <Route path="/" element={<Index />} />
                            <Route path="/edit-profile" element={<EditProfile />} />
                            <Route path="/profile/:userId" element={<UserProfile />} />
                            <Route path="/vocabulary" element={<Vocabulary />} />
                            <Route path="/saved-vocabulary" element={<SavedVocabulary />} />
                            <Route path="/leagues" element={<Leagues />} />
                            <Route path="/leaderboard" element={<LeaderboardPage />} />
                            <Route path="/friends" element={<Friends />} />
                            <Route path="/challenges" element={<Challenges />} />
                            <Route path="/messages" element={<Messages />} />
                            <Route path="/messages/:userId" element={<Messages />} />
                            <Route path="/squads" element={<Squads />} />
                            <Route path="/jlpt" element={<JLPTPortal />} />
                            <Route path="/jlpt/:level" element={<JLPTLevelDetail />} />
                            <Route path="/mock-tests" element={<MockTestCenter />} />
                            <Route path="/mock-tests/:examId" element={<JLPTMockExam />} />
                            <Route path="/grammar" element={<GrammarWiki />} />
                            <Route path="/reading" element={<Reading />} />
                            <Route path="/video-learning" element={<VideoLearning />} />
                            <Route path="/kanji/:kanji" element={<KanjiDetail />} />
                            <Route path="/kanji-worksheet" element={<KanjiWorksheet />} />
                            <Route path="/unit/:unitId" element={<UnitContent />} />
                            <Route path="/modules" element={<ModuleManager />} />
                            <Route path="/admin-import" element={<AdminImport />} />
                            <Route path="/quiz/story" element={<StoryMode />} />
                            <Route path="/sensei" element={<SenseiHub />} />
                            <Route path="/admin/exam-manager" element={<AdminExamManager />} />
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/community-decks" element={<CommunityDecks />} />
                            <Route path="*" element={<NotFound />} />
                          </Route>
                        </Routes>
                        <Toaster />
                        <Sonner />
                      </Suspense>
                    </BrowserRouter>
                  </TooltipProvider>
                </WritingLabProvider>
              </AIProvider>
            </FuriganaProvider>
          </ThemeProvider>
        </ProfileProvider>
      </AuthProvider>
    </ConfettiProvider>
  </QueryClientProvider>
);

export default App;
