import { memo } from 'react';
import { motion } from 'framer-motion';
import { Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const QuickModeBanner = memo(function QuickModeBanner() {
  return (
    <motion.section
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
    >
      <Link to="/quick-mode">
        <div
          className="relative overflow-hidden rounded-3xl p-5 flex items-center gap-5 cursor-pointer group shadow-soft hover:shadow-elevated transition-shadow"
          style={{ background: 'var(--gradient-sakura)' }}
        >
          {/* BG decoration */}
          <div className="absolute right-0 top-0 bottom-0 w-32 opacity-10 flex items-center justify-center">
            <Zap className="h-24 w-24 text-white" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-black text-white text-sm">Quick 5 ⚡</p>
            <p className="text-white/80 text-[10px] font-medium">5 câu hỏi xen kẽ · ~3 phút · Nhận XP ngay</p>
          </div>
          <div className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-xl group-hover:bg-white/30 transition-colors flex-shrink-0">
            <span className="text-white text-[10px] font-black uppercase tracking-wider">Bắt đầu</span>
            <ArrowRight className="h-3 w-3 text-white" />
          </div>
        </div>
      </Link>
    </motion.section>
  );
});
