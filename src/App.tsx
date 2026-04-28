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
import { StandardErrorBoundary } from "./components/StandardErrorBoundary";
import { LevelUpModal } from "@/components/effects/LevelUpModal";
import { XPGainToast } from "@/components/effects/XPGainToast";
import { AppLayout } from "./components/layout/AppLayout";
import { Index } from "./pages/Index";

// Lazy-loaded pages (all pages now use default exports — consistent pattern)
const Vocabulary = React.lazy(() => import("./pages/Vocabulary"));
const SavedVocabulary = React.lazy(() => import("./pages/SavedVocabulary"));
const Auth = React.lazy(() => import("./pages/Auth"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const EditProfile = React.lazy(() => import("./pages/EditProfile"));
const UserProfile = React.lazy(() => import("./pages/UserProfile"));
const Leagues = React.lazy(() => import("./pages/Leagues"));
const LeaderboardPage = React.lazy(() => import("./pages/LeaderboardPage"));
const Friends = React.lazy(() => import("./pages/Friends"));
const Challenges = React.lazy(() => import("./pages/Challenges"));
const Messages = React.lazy(() => import("./pages/Messages"));
const Squads = React.lazy(() => import("./pages/Squads"));
const JLPTPortal = React.lazy(() => import("./pages/JLPTPortal"));
const JLPTLevelDetail = React.lazy(() => import("./pages/JLPTLevelDetail"));
const MockTestCenter = React.lazy(() => import("./pages/MockTestCenter"));
const JLPTMockExam = React.lazy(() => import("./pages/JLPTMockExam"));
const GrammarWiki = React.lazy(() => import("./pages/GrammarWiki"));
const Reading = React.lazy(() => import("./pages/Reading"));
const VideoLearning = React.lazy(() => import("./pages/VideoLearning"));
const KanjiDetail = React.lazy(() => import("./pages/KanjiDetail"));
const KanjiWorksheet = React.lazy(() => import("./pages/KanjiWorksheet"));
const UnitContent = React.lazy(() => import("./pages/UnitContent"));
const ModuleManager = React.lazy(() => import("./pages/ModuleManager"));
const SquadDetail = React.lazy(() => import("./pages/SquadDetail"));
const AdminImport = React.lazy(() => import("./pages/AdminImport"));
const StoryMode = React.lazy(() => import("./pages/StoryMode"));
const StoryModeFrame = React.lazy(() => import("./components/chat/SenseiChatHub/StoryModeFrame"));
const AdminExamManager = React.lazy(() => import("./pages/AdminExamManager"));
const SenseiHub = React.lazy(() => import("./pages/SenseiHub"));
const PvPBattle = React.lazy(() => import("./pages/PvPBattle"));
const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const QuickMode = React.lazy(() => import("./pages/QuickMode"));
const SRSReview = React.lazy(() => import("./pages/SRSReview"));
const News = React.lazy(() => import("./pages/News"));
const Achievements = React.lazy(() => import("./pages/Achievements"));
const CommunityDecks = React.lazy(() => import("./pages/CommunityDecks"));
const MinnaVocabulary = React.lazy(() => import("./pages/MinnaVocabulary"));

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
                      <StandardErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <LevelUpModal />
                          <XPGainToast />
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
                            <Route path="/squads/:squadId" element={<SquadDetail />} />

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
                            <Route path="/review" element={<SRSReview />} />
                            <Route path="/news" element={<News />} />
                            <Route path="/achievements" element={<Achievements />} />
                            <Route path="/minna" element={<MinnaVocabulary />} />
                            <Route path="*" element={<NotFound />} />
                          </Route>
                        </Routes>
                        <Toaster />
                        <Sonner />
                      </Suspense>
                    </StandardErrorBoundary>
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
