import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
  action?: () => void;
}

/**
 * Global keyboard shortcuts:
 * - "?" opens this help modal
 * - "g h" → home, "g v" → vocabulary, "g l" → learning path, "g r" → reading
 */
export const KeyboardShortcuts: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let chord: string | null = null;
    let chordTimer: ReturnType<typeof setTimeout> | null = null;

    const isTyping = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        el.isContentEditable
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Help
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen((s) => !s);
        return;
      }
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }

      // Chord prefix "g"
      if (chord === 'g') {
        const map: Record<string, string> = {
          h: '/',
          v: '/vocabulary',
          l: '/learning-path',
          r: '/reading',
          p: '/profile',
          s: '/squads',
          c: '/chat',
        };
        const path = map[e.key.toLowerCase()];
        if (path) {
          e.preventDefault();
          navigate(path);
        }
        chord = null;
        if (chordTimer) clearTimeout(chordTimer);
        return;
      }
      if (e.key.toLowerCase() === 'g') {
        chord = 'g';
        if (chordTimer) clearTimeout(chordTimer);
        chordTimer = setTimeout(() => (chord = null), 1200);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (chordTimer) clearTimeout(chordTimer);
    };
  }, [navigate]);

  const shortcuts: Shortcut[] = [
    { keys: ['?'], description: 'Mở/đóng bảng phím tắt này' },
    { keys: ['G', 'H'], description: 'Về Trang chủ' },
    { keys: ['G', 'V'], description: 'Mở Từ vựng' },
    { keys: ['G', 'L'], description: 'Mở Lộ trình học' },
    { keys: ['G', 'R'], description: 'Mở Đọc hiểu' },
    { keys: ['G', 'P'], description: 'Mở Hồ sơ' },
    { keys: ['G', 'S'], description: 'Mở Nhóm học' },
    { keys: ['G', 'C'], description: 'Mở Trò chuyện' },
    { keys: ['Esc'], description: 'Đóng hộp thoại đang mở' },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-sakura" />
            Phím tắt
          </DialogTitle>
          <DialogDescription>
            Nhấn <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">?</kbd> bất cứ lúc nào để mở bảng này.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {shortcuts.map((s) => (
            <li
              key={s.description}
              className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0"
            >
              <span className="text-sm text-foreground">{s.description}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-1 text-xs font-bold bg-muted rounded border border-border shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};
