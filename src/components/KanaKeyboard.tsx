import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronUp, ChevronDown, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanaKeyboardProps {
  onKeyPress: (char: string) => void;
  className?: string;
}

const hiraganaRows = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', '', 'ゆ', '', 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', '', 'を', '', 'ん'],
];

const hiraganaDakuten = [
  ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
  ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
  ['だ', 'ぢ', 'づ', 'で', 'ど'],
  ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
  ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
];

const hiraganaSmall = [
  ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'],
  ['ゃ', '', 'ゅ', '', 'ょ'],
  ['っ', '', '', '', ''],
];

const katakanaRows = [
  ['ア', 'イ', 'ウ', 'エ', 'オ'],
  ['カ', 'キ', 'ク', 'ケ', 'コ'],
  ['サ', 'シ', 'ス', 'セ', 'ソ'],
  ['タ', 'チ', 'ツ', 'テ', 'ト'],
  ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
  ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
  ['マ', 'ミ', 'ム', 'メ', 'モ'],
  ['ヤ', '', 'ユ', '', 'ヨ'],
  ['ラ', 'リ', 'ル', 'レ', 'ロ'],
  ['ワ', '', 'ヲ', '', 'ン'],
];

const katakanaDakuten = [
  ['ガ', 'ギ', 'グ', 'ゲ', 'ゴ'],
  ['ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'],
  ['ダ', 'ヂ', 'ヅ', 'デ', 'ド'],
  ['バ', 'ビ', 'ブ', 'ベ', 'ボ'],
  ['パ', 'ピ', 'プ', 'ペ', 'ポ'],
];

const katakanaSmall = [
  ['ァ', 'ィ', 'ゥ', 'ェ', 'ォ'],
  ['ャ', '', 'ュ', '', 'ョ'],
  ['ッ', '', 'ー', '', ''],
];

const KanaKeyboard: React.FC<KanaKeyboardProps> = ({ onKeyPress, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'hiragana' | 'katakana'>('hiragana');
  const [showDakuten, setShowDakuten] = useState(false);

  const renderRow = (row: string[], rowIndex: number) => (
    <div key={rowIndex} className="flex justify-center gap-1">
      {row.map((char, charIndex) => (
        <Button
          key={`${rowIndex}-${charIndex}`}
          variant="outline"
          size="sm"
          className={cn(
            "w-9 h-9 p-0 font-jp text-lg",
            !char && "invisible"
          )}
          onClick={() => char && onKeyPress(char)}
          disabled={!char}
        >
          {char}
        </Button>
      ))}
    </div>
  );

  const currentRows = activeTab === 'hiragana' 
    ? (showDakuten ? [...hiraganaDakuten, ...hiraganaSmall] : hiraganaRows)
    : (showDakuten ? [...katakanaDakuten, ...katakanaSmall] : katakanaRows);

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full gap-2"
      >
        <Keyboard className="h-4 w-4" />
        Bàn phím Kana
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </Button>

      {isOpen && (
        <div className="p-3 bg-muted rounded-lg space-y-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'hiragana' | 'katakana')}>
            <div className="flex items-center justify-between mb-2">
              <TabsList className="grid w-40 grid-cols-2">
                <TabsTrigger value="hiragana" className="font-jp">あ</TabsTrigger>
                <TabsTrigger value="katakana" className="font-jp">ア</TabsTrigger>
              </TabsList>
              <Button
                variant={showDakuten ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDakuten(!showDakuten)}
                className="font-jp"
              >
                {showDakuten ? '基本' : '濁音'}
              </Button>
            </div>

            <TabsContent value="hiragana" className="space-y-1 mt-0">
              {currentRows.map((row, i) => renderRow(row, i))}
            </TabsContent>

            <TabsContent value="katakana" className="space-y-1 mt-0">
              {currentRows.map((row, i) => renderRow(row, i))}
            </TabsContent>
          </Tabs>

          {/* Special characters */}
          <div className="flex justify-center gap-1 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="font-jp"
              onClick={() => onKeyPress('、')}
            >
              、
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-jp"
              onClick={() => onKeyPress('。')}
            >
              。
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-jp"
              onClick={() => onKeyPress('？')}
            >
              ？
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-jp"
              onClick={() => onKeyPress('！')}
            >
              ！
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-jp"
              onClick={() => onKeyPress('ー')}
            >
              ー
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onKeyPress(' ')}
            >
              Space
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KanaKeyboard;
