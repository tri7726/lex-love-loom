import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Languages, Camera, MessageSquare, BrainCircuit, Library } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation } from '@/components/Navigation';
import { GrammarCheckInput } from '@/components/chat/GrammarCheckInput';
import { SnapLearn } from '@/components/chat/SnapLearn';
import { HybridTutor } from '@/components/chat/HybridTutor';
import { FlashcardGenerator } from '@/components/chat/FlashcardGenerator';



export const AITutor = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <BrainCircuit className="h-8 w-8 text-matcha" />
              AI Tutor
            </h1>
            <p className="text-muted-foreground">
              Trợ giảng AI thông minh giúp bạn làm chủ tiếng Nhật
            </p>
          </div>
        </div>

        <Tabs defaultValue="grammar" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-4xl">
            <TabsTrigger value="grammar" className="gap-2">
              <Languages className="h-4 w-4" />
              <span>Sửa ngữ pháp</span>
            </TabsTrigger>
            <TabsTrigger value="snap" className="gap-2">
              <Camera className="h-4 w-4" />
              <span>Snap & Learn</span>
            </TabsTrigger>
            <TabsTrigger value="hybrid" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Hỏi đáp</span>
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="gap-2">
              <Library className="h-4 w-4" />
              <span>Tạo thẻ nhớ</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grammar" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Kiểm tra ngữ pháp tức thì</CardTitle>
                <CardDescription>
                  Nhập câu tiếng Nhật của bạn để nhận phản hồi và sửa lỗi ngay lập tức từ AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GrammarCheckInput />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <Card className="bg-matcha/5 border-matcha/20">
                <CardContent className="p-4 flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-matcha/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-matcha" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">Gợi ý tự nhiên</h4>
                    <p className="text-xs text-muted-foreground">
                      Không chỉ sửa lỗi, AI còn gợi ý các cách diễn đạt tự nhiên hơn như người bản xứ.
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-sakura/5 border-sakura/20">
                <CardContent className="p-4 flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-sakura/20 flex items-center justify-center shrink-0">
                    <BrainCircuit className="h-5 w-5 text-sakura" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm">Giải thích chi tiết</h4>
                    <p className="text-xs text-muted-foreground">
                      Hiểu rõ tại sao bạn sai và học các quy tắc ngữ pháp liên quan.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="snap" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Snap & Learn</CardTitle>
                <CardDescription>
                  Chụp ảnh hoặc tải lên hình ảnh vật thể để học từ vựng và câu ví dụ tiếng Nhật
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SnapLearn />
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="hybrid" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Hỏi đáp & Phân tích thông minh</CardTitle>
                <CardDescription>
                  Sử dụng sức mạnh của Groq và Gemini để phân tích sâu văn bản và trả lời các câu hỏi phức tạp về ngôn ngữ.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HybridTutor />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flashcards" className="space-y-4">
            <FlashcardGenerator />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

// export default AITutor;
