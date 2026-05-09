import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { BookOpen, Link2, ClipboardPaste, Save, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

type Article = {
  id: string;
  title: string;
  content: string;
  url: string | null;
  source_domain: string | null;
  word_count: number | null;
  created_at: string;
};

const urlSchema = z.string().trim().url().max(2000);
const textSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(10).max(50_000),
});

// Split JP text into "words" — naive but works without kuromoji.
// Group consecutive kanji/kana, treat punctuation/space as separators.
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const re = /([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+|[A-Za-z0-9]+|\s+|[^\s])/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) tokens.push(m[1]);
  return tokens;
}

function isLookupable(token: string) {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/u.test(token) && token.length >= 1;
}

const ReaderPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("paste");
  const [url, setUrl] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState<{
    title: string;
    content: string;
    url?: string;
    source_domain?: string;
  } | null>(null);
  const [history, setHistory] = useState<Article[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const tokens = useMemo(() => (current ? tokenize(current.content) : []), [current]);

  const loadHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data } = await (supabase as any)
      .from("reader_articles")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory((data as Article[]) ?? []);
    setHistoryLoading(false);
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchUrl = async () => {
    const parsed = urlSchema.safeParse(url);
    if (!parsed.success) return toast.error("URL không hợp lệ");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-article", {
        body: { url: parsed.data },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setCurrent({
        title: (data as any).title,
        content: (data as any).content,
        url: (data as any).url,
        source_domain: (data as any).source_domain,
      });
      toast.success("Đã tải bài viết");
    } catch (e: any) {
      toast.error("Không tải được: " + (e?.message ?? "lỗi"));
    } finally {
      setLoading(false);
    }
  };

  const usePaste = () => {
    const parsed = textSchema.safeParse({ title: pasteTitle, content: pasteContent });
    if (!parsed.success) return toast.error("Cần tiêu đề và nội dung tối thiểu 10 ký tự");
    setCurrent({ title: parsed.data.title, content: parsed.data.content });
  };

  const saveCurrent = async () => {
    if (!current || !user) return;
    const { error } = await (supabase as any).from("reader_articles").insert({
      user_id: user.id,
      title: current.title,
      content: current.content,
      url: current.url ?? null,
      source_domain: current.source_domain ?? null,
      word_count: current.content.length,
    });
    if (error) toast.error("Lưu thất bại");
    else {
      toast.success("Đã lưu vào thư viện");
      loadHistory();
    }
  };

  const deleteArticle = async (id: string) => {
    await (supabase as any).from("reader_articles").delete().eq("id", id);
    loadHistory();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="text-sakura" /> Reader Mode
        </h1>
        <p className="text-muted-foreground">
          Paste link hoặc text tiếng Nhật → đọc với hover từ điển AI, lưu vào lịch sử.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4">
          {!current && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Nhập nguồn</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="url"><Link2 className="h-4 w-4 mr-1" />URL</TabsTrigger>
                    <TabsTrigger value="paste"><ClipboardPaste className="h-4 w-4 mr-1" />Paste</TabsTrigger>
                  </TabsList>
                  <TabsContent value="url" className="space-y-3 pt-4">
                    <Input
                      placeholder="https://www3.nhk.or.jp/news/..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      maxLength={2000}
                    />
                    <Button onClick={fetchUrl} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                      Tải bài
                    </Button>
                  </TabsContent>
                  <TabsContent value="paste" className="space-y-3 pt-4">
                    <Input
                      placeholder="Tiêu đề"
                      value={pasteTitle}
                      onChange={(e) => setPasteTitle(e.target.value)}
                      maxLength={200}
                    />
                    <Textarea
                      placeholder="Dán nội dung tiếng Nhật..."
                      rows={8}
                      value={pasteContent}
                      onChange={(e) => setPasteContent(e.target.value)}
                      maxLength={50000}
                      className="font-jp"
                    />
                    <Button onClick={usePaste}>
                      <ClipboardPaste className="h-4 w-4 mr-2" /> Đọc
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {current && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="truncate">{current.title}</CardTitle>
                  {current.source_domain && (
                    <Badge variant="outline" className="mt-2">{current.source_domain}</Badge>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setCurrent(null)}>
                    Đổi nguồn
                  </Button>
                  <Button size="sm" onClick={saveCurrent}>
                    <Save className="h-4 w-4 mr-1" /> Lưu
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <article className="font-jp text-lg leading-loose whitespace-pre-wrap">
                  {tokens.map((t, i) =>
                    isLookupable(t) ? (
                      <WordPopover key={i} word={t} />
                    ) : (
                      <span key={i}>{t}</span>
                    ),
                  )}
                </article>
              </CardContent>
            </Card>
          )}
        </div>

        {/* History */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Lịch sử đọc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
            {historyLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Chưa có bài nào.
              </p>
            ) : (
              history.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-md border bg-card flex items-start gap-2"
                >
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() =>
                      setCurrent({
                        title: a.title,
                        content: a.content,
                        url: a.url ?? undefined,
                        source_domain: a.source_domain ?? undefined,
                      })
                    }
                  >
                    <p className="font-semibold text-sm truncate">{a.title}</p>
                    {a.source_domain && (
                      <p className="text-xs text-muted-foreground truncate">{a.source_domain}</p>
                    )}
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteArticle(a.id)}
                    className="h-7 w-7"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ----------------- Word popover with AI dictionary -----------------
const WordPopover: React.FC<{ word: string }> = ({ word }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<{ reading?: string; meaning?: string; example?: string } | null>(null);

  const lookup = async () => {
    if (info || loading) return;
    setLoading(true);
    try {
      // Try dictionary table first
      const { data: dict } = await (supabase as any)
        .from("vocabulary")
        .select("reading,meaning,example_sentence")
        .or(`word.eq.${word},reading.eq.${word}`)
        .limit(1)
        .maybeSingle();
      if (dict) {
        setInfo({
          reading: dict.reading,
          meaning: dict.meaning,
          example: dict.example_sentence,
        });
        return;
      }
      // Fallback to AI lookup via existing chat function
      const { data, error } = await supabase.functions.invoke("japanese-chat", {
        body: {
          message: `Giải thích nhanh từ "${word}": cách đọc, nghĩa tiếng Việt, 1 câu ví dụ. Trả JSON: {"reading":"","meaning":"","example":""}`,
        },
      });
      if (error) throw error;
      const text = (data as any)?.response ?? (data as any)?.message ?? "";
      const m = String(text).match(/\{[\s\S]*\}/);
      if (m) {
        try {
          setInfo(JSON.parse(m[0]));
        } catch {
          setInfo({ meaning: text });
        }
      } else {
        setInfo({ meaning: text });
      }
    } catch {
      setInfo({ meaning: "Không tra được" });
    } finally {
      setLoading(false);
    }
  };

  const saveToFlashcards = async () => {
    if (!user || !info) return;
    const { error } = await (supabase as any).from("flashcards").insert({
      user_id: user.id,
      word,
      reading: info.reading ?? null,
      meaning: info.meaning ?? null,
      example_sentence: info.example ?? null,
      next_review_date: new Date().toISOString(),
    });
    if (error) toast.error("Lưu thất bại");
    else toast.success(`Đã thêm "${word}" vào deck`);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) lookup();
      }}
    >
      <PopoverTrigger asChild>
        <span className="cursor-pointer hover:bg-sakura/15 rounded px-0.5 transition-colors">
          {word}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2">
        <div className="font-jp text-2xl font-bold">{word}</div>
        {loading ? (
          <Skeleton className="h-12" />
        ) : info ? (
          <div className="space-y-1 text-sm">
            {info.reading && <p className="font-jp text-sakura">{info.reading}</p>}
            {info.meaning && <p>{info.meaning}</p>}
            {info.example && (
              <p className="font-jp text-muted-foreground text-xs">{info.example}</p>
            )}
            <Button size="sm" className="w-full mt-2" onClick={saveToFlashcards}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Lưu vào deck
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Đang tra...</p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ReaderPage;
