import React, { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProfileProvider } from "@/hooks/useProfile";
import { ThemeProvider } from "@/hooks/useTheme";
import { FuriganaProvider } from "@/contexts/FuriganaContext";
import { AIProvider } from "@/contexts/AIContext";
import { dictDB } from "@/lib/dictDB";
import { WritingLabProvider } from "@/contexts/WritingLabContext";
import { ConfettiProvider } from "@/components/common/ConfettiProvider";
import { StandardErrorBoundary } from "@/components/error/StandardErrorBoundary";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LevelUpModal } from "@/components/effects/LevelUpModal";
import { XPGainToast } from "@/components/effects/XPGainToast";
import { AppLayout } from "./components/layout/AppLayout";
import { Index } from "./pages/(core)/Index";
import { PWAManager } from "@/components/pwa/PWAManager";
import { CommandPalette } from "@/components/search/CommandPalette";

// Lazy-loaded pages (all pages now use default exports — consistent pattern)
// Core pages
const Auth = React.lazy(() => import("./pages/(core)/Auth"));
const Onboarding = React.lazy(() => import("./pages/(core)/Onboarding"));
const LearningPath = React.lazy(() => import("./pages/(learning)/LearningPath"));
const NotFound = React.lazy(() => import("./pages/(core)/NotFound"));
const UserGuide = React.lazy(() => import("./pages/(core)/UserGuide"));

// Learning pages
const Vocabulary = React.lazy(() => import("./pages/(learning)/Vocabulary"));
const SavedVocabulary = React.lazy(() => import("./pages/(learning)/SavedVocabulary"));
const GrammarWiki = React.lazy(() => import("./pages/(learning)/GrammarWiki"));
const Reading = React.lazy(() => import("./pages/(learning)/Reading"));
const VideoLearning = React.lazy(() => import("./pages/(learning)/VideoLearning"));
const KanjiDetail = React.lazy(() => import("./pages/(learning)/KanjiDetail"));
const UnitContent = React.lazy(() => import("./pages/(learning)/UnitContent"));

const SpeakingPractice = React.lazy(() => import("./pages/(learning)/SpeakingPractice"));
const KanjiByLevel = React.lazy(() => import("./pages/(learning)/KanjiByLevel"));

// Practice pages
const QuickMode = React.lazy(() => import("./pages/(practice)/QuickMode"));
const SRSReview = React.lazy(() => import("./pages/(practice)/SRSReview"));
const PresentationViewer = React.lazy(() => import("./pages/(practice)/PresentationViewer"));

// Exam pages
const MockTestCenter = React.lazy(() => import("./pages/(exams)/MockTestCenter"));
const JLPTMockExam = React.lazy(() => import("./pages/(exams)/JLPTMockExam"));
const KanjiWorksheet = React.lazy(() => import("./pages/(exams)/KanjiWorksheet"));

// Game pages
const PvPBattle = React.lazy(() => import("./pages/(games)/PvPBattle"));
const KanjiBattleArena = React.lazy(() => import("./pages/(games)/KanjiBattleArena"));
const BossBattle = React.lazy(() => import("./pages/(games)/BossBattle"));

// Social pages
const Leagues = React.lazy(() => import("./pages/(social)/Leagues"));
const LeaderboardPage = React.lazy(() => import("./pages/(social)/LeaderboardPage"));
const Friends = React.lazy(() => import("./pages/(social)/Friends"));
const Challenges = React.lazy(() => import("./pages/(social)/Challenges"));
const Squads = React.lazy(() => import("./pages/(social)/Squads"));
const SquadDetail = React.lazy(() => import("./pages/(social)/SquadDetail"));
const Achievements = React.lazy(() => import("./pages/(social)/Achievements"));
const Chat = React.lazy(() => import("./pages/(social)/Chat"));

// Community pages
const CommunityDecks = React.lazy(() => import("./pages/(community)/CommunityDecks"));
const CommunityLibrary = React.lazy(() => import("./pages/(community)/CommunityLibrary"));

// Profile pages
const EditProfile = React.lazy(() => import("./pages/(profile)/EditProfile"));
const UserProfile = React.lazy(() => import("./pages/(profile)/UserProfile"));

// Pet page
const PetPage = React.lazy(() => import("./pages/(pet)/PetPage"));

// Shop page
const SakuraShop = React.lazy(() => import("./pages/(shop)/SakuraShop"));


// Management pages
const ModuleManager = React.lazy(() => import("./pages/(management)/ModuleManager"));
const FolderManager = React.lazy(() => import("./pages/(management)/FolderManager"));

// Admin pages
const AdminDashboard = React.lazy(() => import("./pages/(admin)/AdminDashboard"));
const AdminExamManager = React.lazy(() => import("./pages/(admin)/AdminExamManager"));
const AdminImport = React.lazy(() => import("./pages/(admin)/AdminImport"));
const AdminExperiments = React.lazy(() => import("./pages/(admin)/AdminExperiments"));
const AdminDocs = React.lazy(() => import("./pages/(admin)/AdminDocs"));
const AdminPitchOverrides = React.lazy(() => import("./pages/(admin)/AdminPitchOverrides"));
const AdminTelemetry = React.lazy(() => import("./pages/(admin)/AdminTelemetry"));
const AdminRoles = React.lazy(() => import("./pages/(admin)/AdminRoles"));
const WeaknessHeatmap = React.lazy(() => import("./pages/(learning)/WeaknessHeatmap"));
const ListeningLab = React.lazy(() => import("./pages/(learning)/ListeningLab"));
const ReaderPage = React.lazy(() => import("./pages/(learning)/ReaderPage"));
const PublicProfile = React.lazy(() => import("./pages/(community)/PublicProfile"));
const StudyBuddy = React.lazy(() => import("./pages/(community)/StudyBuddy"));

// Teacher & Curriculum management
const TeacherDashboard = React.lazy(() => import("@/pages/(teacher)/TeacherDashboard"));
const ClassroomDetail = React.lazy(() => import("@/pages/(teacher)/ClassroomDetail"));
const CreateClassroom = React.lazy(() => import("@/pages/(teacher)/CreateClassroom"));
const LessonBuilder = React.lazy(() => import("@/pages/(teacher)/LessonBuilder"));
const LevelCurriculum = React.lazy(() => import("@/pages/(learning)/LevelCurriculum"));
const CurriculumManager = React.lazy(() => import("@/pages/(teacher)/CurriculumManager"));

// Student pages
const MyClasses = React.lazy(() => import("./pages/(student)/MyClasses"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-sakura/20 border-t-sakura animate-spin" />
      <p className="text-sm text-muted-foreground">読み込み中...</p>
    </div>
  </div>
);

const App = () => {
  // Dọn cache từ điển hết hạn 5s sau khi mount (không block UI)
  useEffect(() => {
    const timer = setTimeout(() => {
      dictDB.pruneExpired().catch(() => {/* ignore */});
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
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
                      <PWAManager />
                      <CommandPalette />
                      <StandardErrorBoundary>
                        <Suspense fallback={<PageLoader />}>
                          <LevelUpModal />
                          <XPGainToast />
                          <Routes>
                          {/* Standalone Pages (No global navigation) */}
                          <Route path="/auth" element={<Auth />} />
                          <Route path="/onboarding" element={<Onboarding />} />
                          <Route path="/quick-mode" element={<QuickMode />} />
                          
                          <Route path="/pvp/:challengeId" element={<PvPBattle />} />

                          {/* Redirects for legacy/linked-but-undefined routes */}
                          {/* Lộ trình học JLPT đã có trang chính thức bên dưới */}
                          <Route path="/jlpt" element={<Navigate to="/vocabulary" replace />} />
                          <Route path="/jlpt/:level" element={<Navigate to="/vocabulary" replace />} />

                          {/* Pages wrapped in AppLayout (With navigation) */}
                          <Route element={<AppLayout />}>
                            <Route path="/" element={<Index />} />
                            <Route path="/edit-profile" element={<EditProfile />} />
                            <Route path="/profile/:userId" element={<UserProfile />} />
                            <Route path="/vocabulary" element={<Vocabulary />} />
                            <Route path="/learning-path" element={<LearningPath />} />
                            <Route path="/learning-path/:level" element={<LevelCurriculum />} />
                            <Route path="/learning-path/:level/unit/:unitId" element={<UnitContent />} />
                            <Route path="/saved-vocabulary" element={<SavedVocabulary />} />
                            <Route path="/leagues" element={<Leagues />} />
                            <Route path="/leaderboard" element={<LeaderboardPage />} />
                            <Route path="/friends" element={<Friends />} />
                            <Route path="/challenges" element={<Challenges />} />
                            <Route path="/squads" element={<Squads />} />
                            <Route path="/squads/:squadId" element={<SquadDetail />} />

                            <Route path="/mock-tests" element={<ProtectedRoute><MockTestCenter /></ProtectedRoute>} />
                            <Route path="/mock-tests/:examId" element={<ProtectedRoute><JLPTMockExam /></ProtectedRoute>} />
                            <Route path="/grammar" element={<GrammarWiki />} />
                            <Route path="/reading" element={<ProtectedRoute><Reading /></ProtectedRoute>} />
                            <Route path="/video-learning" element={<VideoLearning />} />
                            <Route path="/kanji/:kanji" element={<KanjiDetail />} />
                            <Route path="/kanji-by-level/:level" element={<KanjiByLevel />} />
                            <Route path="/kanji-worksheet" element={<KanjiWorksheet />} />
                            <Route path="/unit/:unitId" element={<UnitContent />} />
                            <Route path="/modules" element={<ModuleManager />} />
                            <Route path="/folders" element={<FolderManager />} />
                            <Route path="/speaking" element={<SpeakingPractice />} />
                            <Route path="/user-guide" element={<UserGuide />} />
                            <Route path="/admin-import" element={<AdminImport />} />
                            
                            
                            <Route path="/admin/exam-manager" element={<AdminExamManager />} />
                            <Route path="/admin" element={<AdminDashboard />} />
                            <Route path="/admin/experiments" element={<AdminExperiments />} />
                            <Route path="/admin/docs" element={<AdminDocs />} />
                            <Route path="/admin/pitch-overrides" element={<AdminPitchOverrides />} />
                            <Route path="/admin/telemetry" element={<AdminTelemetry />} />
                            <Route path="/admin/roles" element={<AdminRoles />} />
                            <Route path="/heatmap" element={<WeaknessHeatmap />} />
                            <Route path="/listening-lab" element={<ListeningLab />} />
                            <Route path="/reader" element={<ReaderPage />} />
                            <Route path="/buddies" element={<StudyBuddy />} />
                            <Route path="/u/:username" element={<PublicProfile />} />
                            <Route path="/community-decks" element={<CommunityDecks />} />
                            <Route path="/review" element={<SRSReview />} />
                            
                            <Route path="/achievements" element={<Achievements />} />
                            <Route path="/pet" element={<PetPage />} />
                            <Route path="/minna" element={<Navigate to="/vocabulary" replace />} />
                             <Route path="/chat" element={<Chat />} />
                             <Route path="/shop" element={<SakuraShop />} />
                             <Route path="/community-library" element={<CommunityLibrary />} />
                             <Route path="/kanji-arena" element={<KanjiBattleArena />} />
                             <Route path="/boss-battle/:folderId" element={<BossBattle />} />
                             <Route path="/boss-battle" element={<BossBattle />} />

                            {/* Teacher routes (protected by TeacherGuard inside each page) */}
                            <Route path="/teacher" element={<TeacherDashboard />} />
                            <Route path="/teacher/classes/:classId" element={<ClassroomDetail />} />
                            <Route path="/teacher/create-class" element={<CreateClassroom />} />
                            <Route path="/teacher/curriculum" element={<CurriculumManager />} />
                            <Route path="/teacher/lessons/new" element={<LessonBuilder />} />
                            <Route path="/teacher/lessons/:lessonId/edit" element={<LessonBuilder />} />

                            <Route path="/my-classes" element={<MyClasses />} />
                            <Route path="/lessons/:lessonId/view" element={<PresentationViewer />} />

                            <Route path="*" element={<NotFound />} />
                          </Route>
                        </Routes>
                        <Toaster />
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
};

export default App;
