import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/components/messages/useChat';
import { ChatSidebar, ChatWindow, ChatWindowEmptyState } from '@/components/messages';

export const Messages = () => {
  const { user } = useAuth();
  const {
    conversations, selectedConv, messages, search,
    loadingConvs, sending,
    setSelectedConv, setSearch,
    handleSelectConv, handleSend,
  } = useChat(user);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <main className="flex-1 container py-6 flex gap-6 min-h-0">
        <ChatSidebar
          conversations={conversations}
          selectedConv={selectedConv}
          search={search}
          loadingConvs={loadingConvs}
          onSelectConv={handleSelectConv}
          onSearchChange={setSearch}
        />

        {selectedConv ? (
          <ChatWindow
            conversation={selectedConv}
            messages={messages}
            currentUserId={user?.id ?? ''}
            onSend={handleSend}
            onBack={() => setSelectedConv(null)}
            sending={sending}
          />
        ) : (
          <ChatWindowEmptyState />
        )}
      </main>
    </div>
  );
};

export default Messages;
