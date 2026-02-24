import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KanjiData, UserProgress } from '@/hooks/useKanjiDetails';

interface KanjiInfoPanelProps {
  kanji: KanjiData;
  userProgress?: UserProgress | null;
}

const JLPT_COLORS: Record<string, string> = {
  N5: 'bg-green-500',
  N4: 'bg-blue-500',
  N3: 'bg-yellow-500',
  N2: 'bg-orange-500',
  N1: 'bg-red-500',
};

export const KanjiInfoPanel: React.FC<KanjiInfoPanelProps> = ({ kanji, userProgress }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin Kanji</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Large Kanji Display */}
        <div className="text-center space-y-2">
          <div className="text-9xl font-japanese leading-none">
            {kanji.character}
          </div>
          <div className="text-3xl font-bold text-primary">
            {kanji.hanviet}
          </div>
        </div>

        {/* Meanings */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline">Nghĩa</Badge>
            <span className="text-lg">{kanji.meaning_vi}</span>
          </div>
          {kanji.meaning_en && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">English</Badge>
              <span className="text-sm text-muted-foreground">
                {kanji.meaning_en}
              </span>
            </div>
          )}
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Trình độ JLPT</p>
            <Badge className={JLPT_COLORS[kanji.jlpt_level] || 'bg-gray-500'}>
              {kanji.jlpt_level}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Số nét</p>
            <p className="text-lg font-semibold">{kanji.stroke_count}</p>
          </div>
          {kanji.grade && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Cấp độ</p>
              <p className="text-lg font-semibold">Grade {kanji.grade}</p>
            </div>
          )}
          {kanji.frequency && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tần suất</p>
              <p className="text-lg font-semibold">#{kanji.frequency}</p>
            </div>
          )}
        </div>

        {/* Radical */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Bộ thủ (Radical)</p>
          <div className="text-3xl font-japanese">{kanji.radical}</div>
        </div>

        {/* Readings */}
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Âm Kun (訓読み):</p>
            <div className="flex flex-wrap gap-2">
              {kanji.kunyomi && kanji.kunyomi.length > 0 ? (
                kanji.kunyomi.map((reading, idx) => (
                  <Badge key={idx} variant="secondary" className="font-japanese text-base">
                    {reading}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Không có</span>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Âm On (音読み):</p>
            <div className="flex flex-wrap gap-2">
              {kanji.onyomi && kanji.onyomi.length > 0 ? (
                kanji.onyomi.map((reading, idx) => (
                  <Badge key={idx} variant="default" className="font-japanese text-base">
                    {reading}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Không có</span>
              )}
            </div>
          </div>
        </div>

        {/* Components */}
        {kanji.components && kanji.components.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Thành phần cấu tạo:</p>
            <div className="flex flex-wrap gap-2">
              {kanji.components.map((comp, idx) => (
                <div
                  key={idx}
                  className="text-2xl font-japanese border rounded px-3 py-1 hover:bg-accent cursor-pointer transition-colors"
                >
                  {comp}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversion Rules */}
        {kanji.conversion_rules && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Quy tắc chuyển âm:</p>
            <p className="text-sm text-muted-foreground">{kanji.conversion_rules}</p>
          </div>
        )}

        {/* Mnemonic */}
        {kanji.mnemonic && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium mb-1">💡 Gợi nhớ:</p>
            <p className="text-sm">{kanji.mnemonic}</p>
          </div>
        )}

        {/* User Progress */}
        {userProgress && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-lg border">
            <p className="text-sm font-semibold mb-3">📊 Tiến độ học tập</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Trạng thái</p>
                <Badge variant={
                  userProgress.status === 'mastered' ? 'default' :
                  userProgress.status === 'review' ? 'secondary' : 'outline'
                }>
                  {userProgress.status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Độ chính xác</p>
                <p className="font-semibold">{userProgress.recognition_accuracy}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Số lần ôn</p>
                <p className="font-semibold">{userProgress.repetitions}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ôn tập tiếp</p>
                <p className="text-xs">
                  {new Date(userProgress.next_review).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// export default KanjiInfoPanel;
