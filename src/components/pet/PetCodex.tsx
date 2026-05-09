/**
 * PetCodex — full pet encyclopedia panel
 *  Tab 1: Bộ sưu tập — all 6 pet types, locked/unlocked state + conditions
 *  Tab 2: Cây tiến hóa — evolution stages for selected pet
 *  Tab 3: Lịch sử — previous pets owned
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, CheckCircle2, Star, ChevronRight, Clock, Loader2, BookOpen, GitBranch, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePetCodex, CodexPetEntry, PetHistoryEntry } from '@/hooks/usePetCodex';
import { cn } from '@/lib/utils';

type CodexTab = 'collection' | 'evolution' | 'history';

interface PetCodexProps {
  currentPetType?: string | null;
  onClose: () => void;
}

// ── Helper: format date ───────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Sub-component: Pet card in collection ─────────────────────────────────────
const PetCard: React.FC<{ entry: CodexPetEntry; onSelect: () => void; selected: boolean }> = ({
  entry, onSelect, selected,
}) => {
  const { config, unlocked, isCurrentPet, conditions } = entry;
  const allMet = conditions.every(c => c.met);

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={cn(
        'relative text-left p-4 rounded-2xl border-2 transition-all w-full',
        selected ? 'border-sakura shadow-lg shadow-sakura/10 bg-sakura/5' : 'border-border/40 bg-card hover:border-border',
        !unlocked && 'opacity-60'
      )}
    >
      {isCurrentPet && (
        <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest bg-sakura text-white px-2 py-0.5 rounded-full">
          Đang nuôi
        </span>
      )}

      {/* Pet emoji / silhouette */}
      <div className={cn(
        'text-4xl mb-2 transition-all',
        !unlocked && 'grayscale blur-[2px] select-none'
      )}>
        {unlocked ? config.emoji : '❓'}
      </div>

      {/* Name */}
      <p className={cn('font-black text-sm', !unlocked && 'blur-[3px] select-none')}>
        {unlocked ? config.name : '???'}
      </p>

      {/* Lock / unlock indicator */}
      <div className="flex items-center gap-1 mt-1">
        {allMet ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        ) : (
          <Lock className="h-3 w-3 text-muted-foreground/60" />
        )}
        <span className="text-[10px] text-muted-foreground font-medium">
          {allMet ? 'Đã mở khóa' : `${conditions.filter(c => c.met).length}/${conditions.length} điều kiện`}
        </span>
      </div>
    </motion.button>
  );
};

// ── Sub-component: Detailed pet info ─────────────────────────────────────────
const PetDetail: React.FC<{ entry: CodexPetEntry }> = ({ entry }) => {
  const { config, unlocked, conditions, evolutionStages } = entry;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/30">
        <span className={cn('text-5xl', !unlocked && 'grayscale blur-sm')}>
          {unlocked ? config.emoji : '❓'}
        </span>
        <div>
          <h3 className={cn('font-black text-lg', !unlocked && 'blur-sm select-none')}>
            {unlocked ? config.name : '???'}
          </h3>
          <p className={cn('text-xs text-muted-foreground leading-relaxed mt-0.5', !unlocked && 'blur-sm')}>
            {unlocked ? config.description : 'Hoàn thành điều kiện để xem mô tả'}
          </p>
          {unlocked && (
            <div className="flex flex-wrap gap-1 mt-2">
              {config.personality.map(p => (
                <Badge key={p} className={cn('text-[9px] font-black border-0 px-2', config.bgColor, config.color)}>
                  {p}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unlock conditions */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Điều kiện mở khóa</p>
        {conditions.map((c, i) => (
          <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-muted/20 border border-border/20">
            {c.met
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              : <Lock className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
            }
            <span className={cn('text-xs font-medium', c.met ? 'text-foreground' : 'text-muted-foreground')}>
              {c.label}
            </span>
          </div>
        ))}
      </div>

      {/* Evolution stages preview */}
      {unlocked && evolutionStages.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">Chuỗi tiến hóa</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {evolutionStages.map((s, i) => (
              <React.Fragment key={s.evolution_level}>
                <div className="flex flex-col items-center shrink-0 text-center">
                  <span className="text-2xl">{s.emoji}</span>
                  <span className="text-[9px] font-bold text-muted-foreground mt-0.5">{s.form_name}</span>
                  <span className="text-[9px] text-muted-foreground/50">{s.xp_required} XP</span>
                </div>
                {i < evolutionStages.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-component: Evolution Tree tab ────────────────────────────────────────
const EvolutionTree: React.FC<{ pets: CodexPetEntry[] }> = ({ pets }) => {
  const [selected, setSelected] = useState<string>(pets[0]?.config.id || '');
  const entry = pets.find(p => p.config.id === selected);

  return (
    <div className="space-y-4">
      {/* Pet type selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {pets.map(p => (
          <button
            key={p.config.id}
            onClick={() => setSelected(p.config.id)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-black border-2 transition-all',
              selected === p.config.id
                ? 'border-sakura bg-sakura/10 text-sakura'
                : 'border-border/40 text-muted-foreground hover:border-border'
            )}
          >
            {p.unlocked ? p.config.emoji : '❓'} {p.unlocked ? p.config.name : '???'}
          </button>
        ))}
      </div>

      {/* Evolution stages */}
      {entry && entry.evolutionStages.length > 0 ? (
        <div className="space-y-3">
          {entry.evolutionStages.map((stage, i) => (
            <motion.div
              key={stage.evolution_level}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                'flex items-center gap-4 p-4 rounded-2xl border-2 transition-all',
                entry.isCurrentPet && i === entry.evolutionStages.findIndex(s => s.evolution_level === stage.evolution_level)
                  ? 'border-sakura/40 bg-sakura/5'
                  : 'border-border/30 bg-card'
              )}
            >
              {/* Stage number */}
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-muted-foreground">
                  {i + 1}
                </span>
              </div>

              {/* Emoji */}
              <span className={cn('text-3xl shrink-0', !entry.unlocked && 'grayscale blur-sm')}>
                {entry.unlocked ? stage.emoji : '❓'}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn('font-black text-sm', !entry.unlocked && 'blur-sm select-none')}>
                  {entry.unlocked ? stage.form_name : '???'}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  Yêu cầu: <span className="font-black text-gold">{stage.xp_required.toLocaleString()} XP</span>
                </p>
                {entry.unlocked && (
                  <div className="mt-1.5">
                    <Progress
                      value={i === 0 ? 100 : 0}
                      className="h-1"
                    />
                  </div>
                )}
              </div>

              {/* Level badge */}
              <Badge className="shrink-0 bg-muted text-muted-foreground border-0 text-[10px] font-black">
                Lv.{stage.evolution_level}
              </Badge>
            </motion.div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-8">
          Chưa có dữ liệu tiến hóa cho loài này.
        </p>
      )}
    </div>
  );
};

// ── Sub-component: History tab ────────────────────────────────────────────────
const HistoryTab: React.FC<{ history: PetHistoryEntry[] }> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <span className="text-5xl opacity-30">📖</span>
        <p className="text-sm font-bold text-muted-foreground">Chưa có lịch sử</p>
        <p className="text-xs text-muted-foreground/70 max-w-xs leading-relaxed">
          Khi bạn thay thế thú cưng, pet cũ sẽ được lưu vào đây như một kỷ niệm.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((h, i) => (
        <motion.div
          key={h.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="p-4 rounded-2xl border border-border/40 bg-card space-y-2"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl opacity-60">
              {/* Pet type emoji mapping */}
              {{ kitune: '🦊', ryu: '🐉', kappa: '🐢', karasu: '🐦⬛', maneki_neko: '🐱', usagi: '🐰' }[h.pet_type] || '🐾'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-foreground/70">
                {h.pet_name || 'Thú cưng không tên'}
              </p>
              <p className="text-[10px] text-muted-foreground/60 capitalize">
                {h.pet_type} · Lv.{h.evolution_level} · {h.max_pet_xp.toLocaleString()} XP
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
            <Clock className="h-3 w-3" />
            <span>{fmtDate(h.started_at)} → {fmtDate(h.ended_at)}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ── Main Codex panel ──────────────────────────────────────────────────────────
export const PetCodex: React.FC<PetCodexProps> = ({ currentPetType, onClose }) => {
  const { pets, history, loading } = usePetCodex(currentPetType);
  const [tab, setTab] = useState<CodexTab>('collection');
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  const selectedEntry = pets.find(p => p.config.id === selectedPetId);

  const TABS = [
    { id: 'collection' as CodexTab, label: 'Bộ sưu tập', icon: BookOpen },
    { id: 'evolution' as CodexTab, label: 'Tiến hóa', icon: GitBranch },
    { id: 'history' as CodexTab, label: 'Lịch sử', icon: History },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/40 shrink-0">
        <div>
          <h2 className="font-black text-base text-foreground">📖 Pet Codex</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {pets.filter(p => p.unlocked).length}/{pets.length} loài đã mở khóa
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/40 px-3 shrink-0">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelectedPetId(null); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-3 text-xs font-black border-b-2 transition-all',
                tab === t.id
                  ? 'border-sakura text-sakura'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-7 w-7 animate-spin text-sakura" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === 'collection' && (
              <motion.div
                key="collection"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 space-y-4"
              >
                {selectedEntry ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => setSelectedPetId(null)}
                      className="flex items-center gap-1.5 text-xs font-black text-muted-foreground hover:text-sakura transition-colors"
                    >
                      ← Tất cả pet
                    </button>
                    <PetDetail entry={selectedEntry} />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {pets.map((entry, i) => (
                      <motion.div
                        key={entry.config.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                      >
                        <PetCard
                          entry={entry}
                          selected={selectedPetId === entry.config.id}
                          onSelect={() => setSelectedPetId(entry.config.id)}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'evolution' && (
              <motion.div
                key="evolution"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <EvolutionTree pets={pets} />
              </motion.div>
            )}

            {tab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <HistoryTab history={history} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
