import React, { useMemo, useState } from 'react';
import { Download, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { downloadAnkiDeck, type AnkiCard } from '@/lib/ankiExport';
import { toast } from 'sonner';

export interface AnkiExportItem {
  id: string;
  word: string;
  reading?: string | null;
  meaning: string;
  example_sentence?: string | null;
  mastery_level?: number | null;
}

type MasteryFilter = 'all' | 'new' | 'learning' | 'mastered';

interface Props {
  items: AnkiExportItem[];
  trigger?: React.ReactNode;
}

const masteryBucket = (m?: number | null): MasteryFilter => {
  const v = m ?? 0;
  if (v >= 80) return 'mastered';
  if (v >= 50) return 'learning';
  return 'new';
};

export const AnkiExportDialog: React.FC<Props> = ({ items, trigger }) => {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [deckName, setDeckName] = useState(`sakura-vocab-${today}`);
  const [filter, setFilter] = useState<MasteryFilter>('all');
  const [includeFurigana, setIncludeFurigana] = useState(true);
  const [includeExample, setIncludeExample] = useState(true);
  const [reverseCard, setReverseCard] = useState(false);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((i) => masteryBucket(i.mastery_level) === filter);
  }, [items, filter]);

  const cards = useMemo<AnkiCard[]>(() => {
    return filteredItems.map((v) => {
      const reading = includeFurigana && v.reading ? `<br><small>${v.reading}</small>` : '';
      const example = includeExample && v.example_sentence ? `<br><br><i>${v.example_sentence}</i>` : '';
      const front = reverseCard ? v.meaning : `${v.word}${reading}`;
      const back = reverseCard ? `${v.word}${reading}${example}` : `${v.meaning}${example}`;
      return {
        front,
        back,
        tags: ['sakura', `mastery-${masteryBucket(v.mastery_level)}`],
      };
    });
  }, [filteredItems, includeFurigana, includeExample, reverseCard]);

  const handleExport = () => {
    if (!cards.length) {
      toast.info('Không có thẻ nào để xuất');
      return;
    }
    const safeName = deckName.trim().replace(/[^\w\-]+/g, '-') || `sakura-vocab-${today}`;
    downloadAnkiDeck(cards, `${safeName}.txt`);
    toast.success(`Đã xuất ${cards.length} thẻ Anki`);
    setOpen(false);
  };

  const previewCards = cards.slice(0, 3);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất Anki
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Xuất bộ thẻ Anki
          </DialogTitle>
          <DialogDescription>
            Tạo file .txt nhập trực tiếp vào Anki (TSV, hỗ trợ HTML & tags).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="deck-name">Tên bộ thẻ</Label>
            <Input
              id="deck-name"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="sakura-vocab-..."
            />
          </div>

          <div className="space-y-2">
            <Label>Lọc theo độ thành thạo</Label>
            <Select value={filter} onValueChange={(v) => setFilter(v as MasteryFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả ({items.length})</SelectItem>
                <SelectItem value="new">
                  Mới ({items.filter((i) => masteryBucket(i.mastery_level) === 'new').length})
                </SelectItem>
                <SelectItem value="learning">
                  Đang học ({items.filter((i) => masteryBucket(i.mastery_level) === 'learning').length})
                </SelectItem>
                <SelectItem value="mastered">
                  Thành thạo ({items.filter((i) => masteryBucket(i.mastery_level) === 'mastered').length})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="furigana" className="cursor-pointer">Kèm furigana</Label>
              <Switch id="furigana" checked={includeFurigana} onCheckedChange={setIncludeFurigana} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="example" className="cursor-pointer">Kèm câu ví dụ</Label>
              <Switch id="example" checked={includeExample} onCheckedChange={setIncludeExample} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="reverse" className="cursor-pointer">Đảo mặt (Nghĩa → Nhật)</Label>
              <Switch id="reverse" checked={reverseCard} onCheckedChange={setReverseCard} />
            </div>
          </div>

          {previewCards.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Xem trước</Label>
                <Badge variant="secondary">{cards.length} thẻ</Badge>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border bg-background p-2">
                {previewCards.map((c, i) => (
                  <div key={i} className="text-xs grid grid-cols-2 gap-2 border-b last:border-0 pb-2 last:pb-0">
                    <div
                      className="font-jp"
                      dangerouslySetInnerHTML={{ __html: c.front }}
                    />
                    <div
                      className="text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: c.back }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Huỷ</Button>
          <Button onClick={handleExport} disabled={!cards.length}>
            <Download className="h-4 w-4 mr-2" />
            Xuất {cards.length} thẻ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
