import React, { useMemo } from 'react';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Zap, Shield, Moon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PetState = 'idle' | 'happy' | 'hurt' | 'exhausted' | 'attack' | 'defend' | 'sleeping' | 'fainted';

interface AdvancedPetRendererProps {
  baseImage?: string;
  emoji?: string;
  state?: PetState;
  equippedItems?: Record<string, string>;
  className?: string;
  size?: number;
  onClick?: () => void;
  /** Disable the floating particles & aura layer (useful in tiny avatars) */
  minimal?: boolean;
}

// Per-state aura color (HSL via tailwind ring colors translated to inline gradients)
const STATE_AURA: Record<PetState, string> = {
  idle: 'rgba(255, 182, 193, 0.45)',       // soft sakura
  happy: 'rgba(255, 215, 0, 0.55)',        // gold
  hurt: 'rgba(239, 68, 68, 0.55)',         // red
  exhausted: 'rgba(148, 163, 184, 0.45)',  // slate
  attack: 'rgba(249, 115, 22, 0.6)',       // orange
  defend: 'rgba(59, 130, 246, 0.55)',      // blue
  sleeping: 'rgba(129, 140, 248, 0.45)',   // indigo
  fainted: 'rgba(75, 85, 99, 0.4)',        // gray
};

const AdvancedPetRenderer: React.FC<AdvancedPetRendererProps> = ({
  baseImage,
  emoji,
  state = 'idle',
  equippedItems = {},
  className,
  size = 120,
  onClick,
  minimal = false,
}) => {
  const variants: Variants = {
    idle: {
      y: [0, -8, 0, -4, 0],
      rotate: [0, 1.5, -1.5, 0.5, 0],
      scale: [1, 1.02, 1, 1.01, 1],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: 'easeInOut' as any,
      },
    },
    happy: {
      y: [0, -25, 0, -15, 0],
      scale: [1, 1.15, 0.95, 1.1, 1],
      rotate: [0, 12, -12, 8, 0],
      transition: { duration: 0.8, repeat: 2, ease: 'easeOut' as any },
    },
    hurt: {
      x: [0, -12, 12, -10, 8, -4, 0],
      rotate: [0, -5, 5, -3, 0],
      filter: [
        'brightness(1) saturate(1)',
        'brightness(1.6) saturate(2) hue-rotate(-20deg)',
        'brightness(0.8) saturate(0.5)',
        'brightness(1) saturate(1)',
      ],
      transition: { duration: 0.6 },
    },
    exhausted: {
      y: [4, 6, 4],
      opacity: [0.7, 0.55, 0.7],
      scale: 0.93,
      rotate: -6,
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as any },
    },
    attack: {
      x: [0, 60, 90, 0],
      scale: [1, 1.25, 1.15, 1],
      rotate: [0, -15, -10, 0],
      transition: { duration: 0.6, ease: 'easeOut' as any },
    },
    defend: {
      scale: [1, 0.82, 0.88],
      transition: { type: 'spring', stiffness: 400, damping: 15 },
    },
    sleeping: {
      scale: [1, 0.96, 1],
      opacity: [0.95, 0.85, 0.95],
      rotate: [0, 1, 0],
      transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' as any },
    },
    fainted: {
      rotate: 180,
      opacity: 0.5,
      scale: 0.9,
      filter: 'grayscale(1) contrast(0.8)',
      transition: { duration: 1 },
    },
  };

  const accessoryVariants: Variants = {
    idle: { y: [0, -3, 0], transition: { repeat: Infinity, duration: 5, ease: 'easeInOut' as any } },
    happy: { y: [0, -8, 0], rotate: [0, 8, -8, 0], transition: { duration: 0.8, repeat: 2 } },
    attack: { x: [0, 25, 0], transition: { duration: 0.6 } },
    sleeping: { y: [0, -1, 0], transition: { repeat: Infinity, duration: 3 } },
    defend: { scale: 0.9 },
    hurt: {},
    exhausted: {},
    fainted: {},
  };

  const aura = STATE_AURA[state] ?? STATE_AURA.idle;

  // Pre-compute particle positions (stable per render)
  const particles = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        id: i,
        angle: (i / 6) * Math.PI * 2,
        delay: i * 0.4,
        radius: 30 + (i % 3) * 8,
      })),
    []
  );

  return (
    <div
      className={cn('relative flex items-center justify-center select-none', className)}
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {/* Ambient aura glow */}
      {!minimal && (
        <motion.div
          aria-hidden
          animate={{
            scale: state === 'idle' ? [1, 1.15, 1] : state === 'happy' ? [1, 1.4, 1] : 1,
            opacity: state === 'fainted' ? 0.2 : state === 'exhausted' ? 0.4 : 0.85,
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as any }}
          className="absolute inset-0 rounded-full -z-20 blur-2xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 55%, ${aura} 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Floating particles around the pet */}
      {!minimal && (state === 'idle' || state === 'happy' || state === 'sleeping') && (
        <div className="absolute inset-0 -z-10 pointer-events-none">
          {particles.map((p) => {
            const x = Math.cos(p.angle) * p.radius;
            const y = Math.sin(p.angle) * p.radius;
            const isSleep = state === 'sleeping';
            return (
              <motion.span
                key={p.id}
                className="absolute left-1/2 top-1/2 text-[10px]"
                initial={{ opacity: 0, x, y, scale: 0.6 }}
                animate={{
                  opacity: [0, 1, 0],
                  y: [y, y - 30, y - 60],
                  x: [x, x + (p.id % 2 ? 6 : -6), x],
                  scale: [0.6, 1, 0.5],
                  rotate: [0, 30, -10],
                }}
                transition={{
                  duration: 3 + (p.id % 3),
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeOut' as any,
                }}
              >
                {isSleep ? '💤' : state === 'happy' ? '✨' : ['🌸', '✨', '·'][p.id % 3]}
              </motion.span>
            );
          })}
        </div>
      )}

      <motion.div
        variants={variants}
        animate={state}
        whileHover={{ rotateY: 12, rotateX: -6, scale: 1.06 }}
        style={{ perspective: 1000, transformStyle: 'preserve-3d' }}
        className="relative w-full h-full flex items-center justify-center cursor-pointer"
      >
        {/* Ground shadow with breathing */}
        <motion.div
          aria-hidden
          animate={{
            scaleX: state === 'idle' ? [1, 0.7, 1] : state === 'attack' ? 0.4 : 1,
            opacity: state === 'attack' ? 0 : state === 'fainted' ? 0.05 : 0.2,
            y: state === 'idle' ? [0, 4, 0] : 0,
          }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' as any }}
          className="absolute bottom-1 w-[68%] h-3 rounded-[50%] -z-10"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(6px)',
          }}
        />

        {/* Back accessories */}
        {equippedItems?.back && (
          <motion.img
            variants={accessoryVariants}
            src={equippedItems.back}
            style={{ translateZ: -20 }}
            className="absolute inset-0 w-full h-full object-contain -z-10 filter drop-shadow-lg"
          />
        )}

        {/* Pet body */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {baseImage ? (
            <motion.img
              src={baseImage}
              alt="Pet"
              draggable={false}
              style={{ translateZ: 0 }}
              className={cn(
                'w-[92%] h-[92%] object-contain transition-all duration-300',
                'drop-shadow-[0_18px_28px_rgba(0,0,0,0.25)]',
                state === 'hurt' && 'contrast-150 brightness-150',
                state === 'exhausted' && 'grayscale-[0.4] brightness-90',
                state === 'sleeping' && 'brightness-95',
                state === 'fainted' && 'grayscale'
              )}
            />
          ) : (
            <motion.span
              style={{ translateZ: 0 }}
              className="text-[5em] leading-none drop-shadow-[0_18px_28px_rgba(0,0,0,0.2)]"
            >
              {emoji || '🥚'}
            </motion.span>
          )}

          {/* Front accessories */}
          {equippedItems?.head && (
            <motion.img
              variants={accessoryVariants}
              src={equippedItems.head}
              style={{ translateZ: 40 }}
              className="absolute top-[3%] w-[58%] h-[58%] object-contain drop-shadow-md"
            />
          )}
          {equippedItems?.eyes && (
            <motion.img
              variants={accessoryVariants}
              src={equippedItems.eyes}
              style={{ translateZ: 50 }}
              className="absolute top-[30%] w-[46%] h-[46%] object-contain"
            />
          )}

          {/* Subtle highlight (specular) */}
          {!minimal && (
            <span
              aria-hidden
              className="absolute top-[12%] left-[18%] w-[22%] h-[18%] rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)',
                mixBlendMode: 'screen',
              }}
            />
          )}
        </div>

        {/* VFX Layers */}
        <AnimatePresence>
          {state === 'happy' && (
            <>
              <motion.div
                key="happy-spark-1"
                initial={{ opacity: 0, scale: 0, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="h-7 w-7 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
              </motion.div>
              <motion.div
                key="happy-heart"
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: [0, 1, 0], y: -40, scale: 1 }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute top-0 left-1/2 -translate-x-1/2"
              >
                <Heart className="h-5 w-5 fill-pink-500 text-pink-500" />
              </motion.div>
            </>
          )}
          {state === 'attack' && (
            <motion.div
              key="atk"
              initial={{ opacity: 0, scale: 0.5, x: -10 }}
              animate={{ opacity: 1, scale: 1.4, x: 20 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute right-0 top-1/3"
            >
              <Zap className="h-8 w-8 fill-orange-400 text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.9)]" />
            </motion.div>
          )}
          {state === 'defend' && (
            <>
              <motion.div
                key="def-bubble"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.45, scale: 1.25 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 rounded-full -z-20"
                style={{
                  background:
                    'radial-gradient(circle, rgba(96,165,250,0.5) 0%, rgba(59,130,246,0.15) 60%, transparent 80%)',
                  boxShadow: '0 0 30px rgba(59,130,246,0.6)',
                }}
              />
              <motion.div
                key="def-icon"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-1 left-1/2 -translate-x-1/2"
              >
                <Shield className="h-5 w-5 fill-blue-300 text-blue-600" />
              </motion.div>
            </>
          )}
          {state === 'sleeping' && (
            <motion.div
              key="sleep"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: [0, 1, 0], y: [-5, -25, -40], x: [0, 6, 12] }}
              transition={{ duration: 2.5, repeat: Infinity }}
              className="absolute -top-1 right-1"
            >
              <Moon className="h-4 w-4 fill-indigo-300 text-indigo-500" />
            </motion.div>
          )}
          {state === 'hurt' && (
            <motion.div
              key="hurt"
              initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
              animate={{ opacity: 1, scale: 1.2, rotate: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-2 left-1/2 -translate-x-1/2 text-2xl"
            >
              💥
            </motion.div>
          )}
          {state === 'exhausted' && (
            <motion.div
              key="exh"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 right-1 text-base"
            >
              💧
            </motion.div>
          )}
          {state === 'fainted' && (
            <motion.div
              key="ko"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-0.5"
            >
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AdvancedPetRenderer;
