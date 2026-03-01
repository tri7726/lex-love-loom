import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Folder, FolderPlus, Clock } from 'lucide-react';

interface VocabularyFolder {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
}

interface FolderSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectFolder: (folderId: string) => void;
  title?: string;
}

export const FolderSelectionDialog: React.FC<FolderSelectionDialogProps> = ({
  open,
  onClose,
  onSelectFolder,
  title = "Select Folder",
}) => {
  const [folders, setFolders] = useState<VocabularyFolder[]>([]);
  const [recentFolders, setRecentFolders] = useState<VocabularyFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Load folders when dialog opens
  useEffect(() => {
    if (open) {
      loadFolders();
      loadRecentFolders();
    }
  }, [open]);

  const loadFolders = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('vocabulary_folders')
        .select('id, name, icon, color, parent_id')
        .eq('user_id', session.user.id)
        .order('name');

      if (error) throw error;
      setFolders((data || []) as VocabularyFolder[]);
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentFolders = async () => {
    // Load recent folders from localStorage
    const recent = localStorage.getItem('recentFolders');
    if (recent) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const recentIds: string[] = JSON.parse(recent);
        const { data, error } = await supabase
          .from('vocabulary_folders')
          .select('id, name, icon, color, parent_id')
          .eq('user_id', session.user.id)
          .in('id', recentIds);
        
        if (!error && data) {
          setRecentFolders(data as VocabularyFolder[]);
        }
      } catch (err) {
        console.error('Failed to load recent folders:', err);
      }
    }
  };

  const saveRecentFolder = (folderId: string) => {
    const recent = localStorage.getItem('recentFolders');
    let recentIds: string[] = recent ? JSON.parse(recent) : [];
    
    // Add to front, remove duplicates, keep only 5
    recentIds = [folderId, ...recentIds.filter(id => id !== folderId)].slice(0, 5);
    
    localStorage.setItem('recentFolders', JSON.stringify(recentIds));
  };

  const handleSelectFolder = (folderId: string) => {
    saveRecentFolder(folderId);
    onSelectFolder(folderId);
    onClose();
  };

  // Filter folders based on search
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-0 rounded-2xl flex flex-col max-h-[85vh]">
        <DialogHeader className="p-6 pb-2 text-left">
          <DialogTitle className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-1">{title}</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Choose a folder to add your flashcards to
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2 flex flex-col flex-1 min-h-0">
          {/* Search */}
          <div className="relative mb-4 shrink-0">
            <Input
              placeholder="Search folders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-4 rounded-xl border-sakura focus-visible:ring-sakura/20 h-12"
            />
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Recent Folders */}
              {recentFolders.length > 0 && !search && (
                <div className="mb-4 shrink-0">
                  <h4 className="text-sm font-serif font-medium mb-2 flex items-center gap-2 text-slate-500 dark:text-slate-400 px-1">
                    <Clock className="h-3 w-3" />
                    Recent
                  </h4>
                  <div className="grid grid-cols-1 gap-1">
                    {recentFolders.map((folder) => (
                      <FolderItem
                        key={folder.id}
                        folder={folder}
                        onSelect={() => handleSelectFolder(folder.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Folders */}
              <div className="flex flex-col flex-1 min-h-0">
                {!search && <h4 className="text-sm font-serif mb-2 text-slate-500 dark:text-slate-400 px-1">All Folders</h4>}
                <div className="flex-1 overflow-y-auto px-1 pb-4">
                  {filteredFolders.length === 0 ? (
                    <div className="text-center text-slate-500 dark:text-slate-400 text-sm py-8">
                      {search ? 'No folders found' : 'No folders yet. Create one in Folder Manager.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1">
                      {filteredFolders.map((folder) => (
                        <FolderItem
                          key={folder.id}
                          folder={folder}
                          onSelect={() => handleSelectFolder(folder.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Folder item component
const FolderItem: React.FC<{
  folder: VocabularyFolder;
  onSelect: () => void;
}> = ({ folder, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left group"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-lg shrink-0">
        {folder.icon || '📁'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate group-hover:text-sakura transition-colors text-slate-700 dark:text-slate-300">{folder.name}</p>
      </div>
    </button>
  );
};

// export default FolderSelectionDialog;
