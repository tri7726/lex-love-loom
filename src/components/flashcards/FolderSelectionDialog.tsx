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

const FolderSelectionDialog: React.FC<FolderSelectionDialogProps> = ({
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
      const { data, error } = await supabase
        .from('vocabulary_folders')
        .select('id, name, icon, color, parent_id')
        .order('name');

      if (error) throw error;
      setFolders(data || []);
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
        const recentIds: string[] = JSON.parse(recent);
        const { data, error } = await supabase
          .from('vocabulary_folders')
          .select('id, name, icon, color, parent_id')
          .in('id', recentIds);
        
        if (!error && data) {
          setRecentFolders(data);
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Choose a folder to add your flashcards to
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <Input
            placeholder="Search folders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Recent Folders */}
              {recentFolders.length > 0 && !search && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Recent
                  </h4>
                  <div className="space-y-1">
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
              <div>
                {!search && <h4 className="text-sm font-medium mb-2 text-muted-foreground">All Folders</h4>}
                <ScrollArea className="h-64">
                  {filteredFolders.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">
                      {search ? 'No folders found' : 'No folders yet. Create one in Folder Manager.'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredFolders.map((folder) => (
                        <FolderItem
                          key={folder.id}
                          folder={folder}
                          onSelect={() => handleSelectFolder(folder.id)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
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
      className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors text-left"
    >
      <div
        className="flex items-center justify-center w-8 h-8 rounded"
        style={{ backgroundColor: folder.color || '#10b981' }}
      >
        <span className="text-lg">{folder.icon || '📁'}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{folder.name}</div>
      </div>
      <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
};

export default FolderSelectionDialog;
