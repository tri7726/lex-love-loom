/**
 * ClickableText — P2 của Local Dictionary Engine
 * Wrapper bọc text tiếng Nhật, lắng nghe double-click / bôi đen + mouseup
 * để hiện WordPopover tra từ tức thì.
 */
import React, { useState, useRef, useCallback } from 'react';
import { isJapanese } from '@/lib/deInflector';
import { WordPopover } from './WordPopover';

interface ClickableTextProps {
  text?: string;
  children?: React.ReactNode;
  className?: string;
  /** Cho phép tắt nếu cần (ví dụ trong mode quiz) */
  disabled?: boolean;
}

interface PopoverState {
  word: string;
  x: number;
  y: number;
}

export const ClickableText: React.FC<ClickableTextProps> = ({
  text,
  children,
  className,
  disabled = false,
}) => {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() ?? '';

      // Bỏ qua nếu không có text hoặc text không phải tiếng Nhật
      if (!selectedText || !isJapanese(selectedText)) return;

      // Giới hạn độ dài từ hợp lý (1-10 ký tự)
      if (selectedText.length > 10) return;

      setPopover({
        word: selectedText,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [disabled]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() ?? '';

      if (selectedText && isJapanese(selectedText) && selectedText.length <= 10) {
        setPopover({
          word: selectedText,
          x: e.clientX,
          y: e.clientY,
        });
      }
    },
    [disabled]
  );

  const closePopover = useCallback(() => {
    setPopover(null);
  }, []);

  // Tính vị trí popover — tránh tràn màn hình
  const popoverStyle = popover
    ? {
        position: 'fixed' as const,
        top: Math.min(popover.y + 12, window.innerHeight - 320),
        left: Math.min(popover.x - 36, window.innerWidth - 300),
        zIndex: 200,
      }
    : undefined;

  return (
    <>
      <div
        ref={wrapperRef}
        className={className}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: disabled ? 'default' : 'text' }}
      >
        {text ?? children}
      </div>

      {popover && (
        <>
          {/* Overlay mờ để click ngoài đóng popover */}
          <div
            className="fixed inset-0 z-[199]"
            onClick={closePopover}
          />
          <div style={popoverStyle}>
            <WordPopover
              word={popover.word}
              onClose={closePopover}
            />
          </div>
        </>
      )}
    </>
  );
};
