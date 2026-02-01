import { Sidebar, MessageInput, MessageList, ChatNavbar } from '@/components/chat';
import { useRealtime } from '@/hooks/useRealtime';
import { useChatStore } from '@/stores/chatStore';
import { useEffect } from 'react';

export const ChatPage = () => {
  useRealtime();
  const unreadCounts = useChatStore((state) => state.unreadCounts);

  useEffect(() => {
    // Sum up only stream keys (which are numeric IDs without a colon) to get the total
    const totalUnreads = Object.entries(unreadCounts)
      .filter(([key]) => !key.includes(':'))
      .reduce((sum, [_, count]) => sum + count, 0);

    if (totalUnreads > 0) {
      document.title = `(${totalUnreads}) Zulip Mini`;
    } else {
      document.title = 'Zulip Mini';
    }
  }, [unreadCounts]);

  return (
    <div className="flex h-screen bg-[#151a21] overflow-hidden font-sans selection:bg-indigo-500/30">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-full relative z-10 overflow-hidden bg-[#1a1f28]">
          {/* Navbar */}
          <ChatNavbar />
          
          <div className="flex-1 flex flex-col min-h-0">
             <MessageList />
          </div>
          <div className="z-20">
             <MessageInput />
          </div>
      </main>
    </div>
  );
};
