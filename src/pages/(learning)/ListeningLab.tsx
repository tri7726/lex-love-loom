import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Headphones, Play, Pause, RotateCcw, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Exercise = {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  transcript: string;
  translation: string | null;
  jlpt_level: string | null;
  type: string;
  duration_seconds: number | null;
};

type Mode = "speed" | "fill_blank" | "dictation";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

// ----------------- Audio player hook -----------------
function useAudio(src: string | undefined, rate: number) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!src) return;
    const a = new Audio(src);
    a.preload = "auto";
    a.playbackRate = rate;
    a.onended = () => setPlaying(false);
    a.onpause = () => setPlaying(false);
    a.onplay = () => setPlaying(true);
    ref.current = a;
    return () => {
      a.pause();
      ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
  }, [rate]);

  return {
    playing,
    play: () => ref.current?.play().catch(() => {}),
    pause: () => ref.current?.pause(),
    restart: () => {
      if (ref.current) {
        ref.current.currentTime = 0;
        ref.current.play().catch(() => {});
      }
    },
  };
}

// ----------------- Diff scoring -----------------
function charDiffScore(expected: string, actual: string) {
  const a = (expected ?? "").trim();
  const b = (actual ?? "").trim();
  if (!a) return { score: 0, mistakes: [] as string[] };
  const max = Math.max(a.length, b.length);
  let correct = 0;
  const mistakes: string[] = [];
  for (let i = 0; i < max; i++) {
    if (a[i] && a[i] === b[i]) correct++;
    else if (a[i] && b[i] && a[i] !== b[i]) mistakes.push(`${i}:${a[i]}→${b[i]}`);
  }
  return { score: Math.round((correct / max) * 100), mistakes };
}

// ----------------- Fill-in-blank generator -----------------
function makeBlanks(transcript: string): { tokens: { text: string; blank: boolean }[]; answers: string[] } {
  // split keeping spaces & punctuation; blank ~ every 4th non-space token longer than 1 char
  const parts = transcript.split(/(\s+|[、。！？「」『』,.!?])/);
  const answers: string[] = [];
  let count = 0;
  const tokens = parts.map((p) => {
    if (!p || /^\s+$/.test(p) || /^[、。！？「」『』,.!?]$/.test(p)) {
      return { text: p, blank: false };
    }
    count++;
    if (count % 4 === 0 && p.length >= 1) {
      answers.push(p);
      return { text: p, blank: true };
    }
    return { text: p, blank: false };
  });
  return { tokens, answers };
}

// ----------------- Page -----------------
const ListeningLab: React.FC = () => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<string>("all");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [mode, setMode] = useState<Mode>("speed");
  const [rate, setRate] = useState(1);
  const audio = useAudio(selected?.audio_url, rate);

  // Dictation state
  const [dictInput, setDictInput] = useState("");
  const [dictResult, setDictResult] = useState<{ score: number; mistakes: string[] } | null>(null);

  // Fill-in-blank state
  const [blankInputs, setBlankInputs] = useState<string[]>([]);
  const [blankResult, setBlankResult] = useState<{ score: number; mistakes: string[] } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const q = (supabase as any).from("listening_exercises").select("*").order("created_at", { ascending: false });
      const { data } = await q;
      setExercises((data as Exercise[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => (level === "all" ? exercises : exercises.filter((e) => e.jlpt_level === level)),
    [exercises, level],
  );

  const fillData = useMemo(
    () => (selected ? makeBlanks(selected.transcript) : { tokens: [], answers: [] }),
    [selected],
  );

  const openExercise = (e: Exercise) => {
    setSelected(e);
    setDictInput("");
    setDictResult(null);
    setBlankInputs([]);
    setBlankResult(null);
    setRate(1);
  };

  const submitDictation = async () => {
    if (!selected) return;
    const r = charDiffScore(selected.transcript, dictInput);
    setDictResult(r);
    if (user) {
      await (supabase as any).from("user_listening_attempts").insert({
        user_id: user.id,
        exercise_id: selected.id,
        mode: "dictation",
        score: r.score,
        playback_rate: rate,
        user_input: dictInput,
        mistakes: r.mistakes,
      });
    }
    toast.success(`Dictation: ${r.score}/100`);
  };

  const submitBlanks = async () => {
    if (!selected) return;
    const expected = fillData.answers;
    let correct = 0;
    const mistakes: string[] = [];
    expected.forEach((ans, i) => {
      const got = (blankInputs[i] ?? "").trim();
      if (got === ans) correct++;
      else mistakes.push(`${ans}≠${got || "_"}`);
    });
    const score = expected.length === 0 ? 0 : Math.round((correct / expected.length) * 100);
    setBlankResult({ score, mistakes });
    if (user) {
      await (supabase as any).from("user_listening_attempts").insert({
        user_id: user.id,
        exercise_id: selected.id,
        mode: "fill_blank",
        score,
        playback_rate: rate,
        user_input: JSON.stringify(blankInputs),
        mistakes,
      });
    }
    toast.success(`Fill-in: ${score}/100`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Headphones className="text-sakura" /> Listening Lab
        </h1>
        <p className="text-muted-foreground">
          Luyện nghe với tốc độ 0.5×–1.5×, điền chỗ trống, và dictation chấm bằng diff.
        </p>
      </header>

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        {/* Library */}
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Bài luyện</CardTitle>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả JLPT</SelectItem>
                {["N5", "N4", "N3", "N2", "N1"].map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Chưa có bài luyện nào. Admin có thể thêm trong Supabase.
              </p>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  onClick={() => openExercise(e)}
                  className={`w-full text-left p-3 rounded-md border transition ${
                    selected?.id === e.id
                      ? "bg-sakura/10 border-sakura"
                      : "bg-card hover:border-sakura/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{e.title}</span>
                    {e.jlpt_level && <Badge variant="outline">{e.jlpt_level}</Badge>}
                  </div>
                  {e.description && (
                    <p className="text-xs text-muted-foreground truncate mt-1">{e.description}</p>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Player + modes */}
        <Card>
          {!selected ? (
            <CardContent className="py-16 text-center text-muted-foreground">
              <Sparkles className="mx-auto mb-3 text-sakura" />
              Chọn một bài luyện ở cột trái để bắt đầu.
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{selected.title}</CardTitle>
                    {selected.description && (
                      <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
                    )}
                  </div>
                  {selected.jlpt_level && <Badge>{selected.jlpt_level}</Badge>}
                </div>

                {/* Player controls */}
                <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                  <Button size="icon" onClick={audio.playing ? audio.pause : audio.play}>
                    {audio.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="outline" onClick={audio.restart}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-xs font-mono w-10 text-muted-foreground">{rate.toFixed(2)}×</span>
                    <Slider
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      value={[rate]}
                      onValueChange={(v) => setRate(v[0])}
                    />
                  </div>
                  <div className="flex gap-1">
                    {SPEEDS.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={Math.abs(rate - s) < 0.01 ? "default" : "outline"}
                        onClick={() => setRate(s)}
                        className="h-7 px-2 text-xs"
                      >
                        {s}×
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="speed">Speed Trainer</TabsTrigger>
                    <TabsTrigger value="fill_blank">Fill-in-blank</TabsTrigger>
                    <TabsTrigger value="dictation">Dictation</TabsTrigger>
                  </TabsList>

                  {/* SPEED */}
                  <TabsContent value="speed" className="space-y-3 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Bật/tắt tốc độ và lặp lại để luyện tai. Có thể bật transcript bên dưới.
                    </p>
                    <details className="rounded-md border p-3">
                      <summary className="cursor-pointer text-sm font-medium">Hiện transcript</summary>
                      <p className="font-jp text-base mt-3 leading-relaxed whitespace-pre-wrap">
                        {selected.transcript}
                      </p>
                      {selected.translation && (
                        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                          {selected.translation}
                        </p>
                      )}
                    </details>
                  </TabsContent>

                  {/* FILL-IN-BLANK */}
                  <TabsContent value="fill_blank" className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Nghe và điền các từ bị ẩn. Mỗi từ thứ 4 sẽ bị ẩn.
                    </p>
                    <div className="font-jp text-lg leading-loose p-4 rounded-md border bg-muted/20">
                      {(() => {
                        let blankIdx = -1;
                        return fillData.tokens.map((t, i) => {
                          if (!t.blank) return <span key={i}>{t.text}</span>;
                          blankIdx++;
                          const idx = blankIdx;
                          return (
                            <Input
                              key={i}
                              value={blankInputs[idx] ?? ""}
                              onChange={(e) => {
                                const next = [...blankInputs];
                                next[idx] = e.target.value;
                                setBlankInputs(next);
                              }}
                              className="inline-block w-24 h-8 mx-1 align-middle font-jp"
                              placeholder="___"
                            />
                          );
                        });
                      })()}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button onClick={submitBlanks}>
                        <Check className="h-4 w-4 mr-2" /> Chấm điểm
                      </Button>
                      {blankResult && (
                        <Badge variant={blankResult.score >= 70 ? "default" : "destructive"}>
                          {blankResult.score}/100
                        </Badge>
                      )}
                    </div>
                    {blankResult && blankResult.mistakes.length > 0 && (
                      <div className="text-xs font-mono p-3 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                        {blankResult.mistakes.join(" · ")}
                      </div>
                    )}
                  </TabsContent>

                  {/* DICTATION */}
                  <TabsContent value="dictation" className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Nghe và gõ lại toàn bộ. Chấm theo character-diff.
                    </p>
                    <Textarea
                      rows={5}
                      value={dictInput}
                      onChange={(e) => setDictInput(e.target.value)}
                      placeholder="Gõ những gì bạn nghe được..."
                      className="font-jp text-base"
                    />
                    <div className="flex items-center gap-3">
                      <Button onClick={submitDictation}>
                        <Check className="h-4 w-4 mr-2" /> Chấm điểm
                      </Button>
                      {dictResult && (
                        <Badge variant={dictResult.score >= 70 ? "default" : "destructive"}>
                          {dictResult.score}/100
                        </Badge>
                      )}
                    </div>
                    {dictResult && (
                      <details className="rounded-md border p-3">
                        <summary className="cursor-pointer text-sm font-medium">Đáp án</summary>
                        <p className="font-jp text-base mt-3 whitespace-pre-wrap">{selected.transcript}</p>
                      </details>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ListeningLab;
