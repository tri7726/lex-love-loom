import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CreateFolderDialogProps {
  showCreateDialog: boolean;
  setShowCreateDialog: (show: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  newFolderEmoji: string;
  setNewFolderEmoji: (emoji: string) => void;
  handleCreateFolder: () => void;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  showCreateDialog, setShowCreateDialog, newFolderName, setNewFolderName, newFolderEmoji, setNewFolderEmoji, handleCreateFolder
}) => {
  return (
    <AnimatePresence>
      {showCreateDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-background rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-5 border border-rose-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-rose-400" />
              Tạo folder mới
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Emoji</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {['📝', '📚', '🌸', '⭐', '🚀', '💡', '🎯', '🌟'].map((e) => (
                    <button
                      key={e}
                      className={cn('w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all', newFolderEmoji === e ? 'bg-rose-200 ring-2 ring-rose-400' : 'bg-muted hover:bg-rose-100')}
                      onClick={() => setNewFolderEmoji(e)}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Tên folder</label>
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ví dụ: Từ vựng công ty, JLPT N3 yếu..."
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-rose-200 focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none transition-all bg-background"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Hủy</Button>
              <Button
                className="bg-gradient-to-r from-rose-400 to-pink-400 text-white"
                disabled={!newFolderName.trim()}
                onClick={handleCreateFolder}
              >
                Tạo folder
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
