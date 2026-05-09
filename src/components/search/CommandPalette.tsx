import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  BookOpen,
  Brain,
  Trophy,
  Users,
  Heart,
  ShoppingBag,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface Result {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  icon?: string;
}

const STATIC_PAGES: Result[] = [
  { type: "page", id: "home", title: "Trang chủ", url: "/", icon: "🏠" },
  { type: "page", id: "vocab", title: "Từ vựng", url: "/vocabulary", icon: "📝" },
  { type: "page", id: "grammar", title: "Ngữ pháp", url: "/grammar", icon: "📐" },
  { type: "page", id: "reading", title: "Đọc hiểu", url: "/reading", icon: "📖" },
  { type: "page", id: "video", title: "Video Learning", url: "/video-learning", icon: "🎬" },
  { type: "page", id: "speaking", title: "Luyện nói", url: "/speaking", icon: "🎤" },
  { type: "page", id: "review", title: "Ôn SRS", url: "/review", icon: "🔁" },
  { type: "page", id: "mock", title: "Đề thi thử", url: "/mock-tests", icon: "📋" },
  { type: "page", id: "leaderboard", title: "Bảng xếp hạng", url: "/leaderboard", icon: "🏆" },
  { type: "page", id: "friends", title: "Bạn bè", url: "/friends", icon: "👥" },
  { type: "page", id: "pet", title: "Thú cưng", url: "/pet", icon: "🐾" },
  { type: "page", id: "shop", title: "Cửa hàng Sakura", url: "/shop", icon: "🛍️" },
  
  { type: "page", id: "heatmap", title: "Bản đồ điểm yếu", url: "/heatmap", icon: "🔥" },
];

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);
  const navigate = useNavigate();

  // ⌘K / Ctrl+K toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Debounced backend search
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/global-search?q=${encodeURIComponent(
          query,
        )}&limit=5`;
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await r.json();
        setResults(j.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  const go = useCallback(
    (url: string) => {
      setOpen(false);
      setQuery("");
      navigate(url);
    },
    [navigate],
  );

  const filteredPages = query
    ? STATIC_PAGES.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase()),
      )
    : STATIC_PAGES.slice(0, 8);

  const grouped: Record<string, Result[]> = {};
  for (const r of results) {
    grouped[r.type] = grouped[r.type] || [];
    grouped[r.type].push(r);
  }

  const groupLabels: Record<string, string> = {
    kanji: "Kanji",
    vocab: "Từ vựng",
    grammar: "Ngữ pháp",
    deck: "Bộ thẻ",
    video: "Video",
    lesson: "Bài giảng",
    friend: "Bạn bè",
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Tìm kanji, từ vựng, deck, video, bạn bè... (⌘K)"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Đang tìm..." : "Không có kết quả."}
        </CommandEmpty>

        <CommandGroup heading="Trang">
          {filteredPages.map((p) => (
            <CommandItem key={p.id} onSelect={() => go(p.url)} value={p.title}>
              <span className="mr-2">{p.icon}</span>
              {p.title}
            </CommandItem>
          ))}
        </CommandGroup>

        {Object.entries(grouped).map(([type, items]) => (
          <React.Fragment key={type}>
            <CommandSeparator />
            <CommandGroup heading={groupLabels[type] ?? type}>
              {items.map((r) => (
                <CommandItem
                  key={`${type}-${r.id}`}
                  value={`${r.title}-${r.id}`}
                  onSelect={() => go(r.url)}
                >
                  <span className="mr-2">{r.icon}</span>
                  <span className="font-medium">{r.title}</span>
                  {r.subtitle && (
                    <span className="ml-2 text-xs text-muted-foreground truncate">
                      {r.subtitle}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
};

export default CommandPalette;
