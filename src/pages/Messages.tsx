import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquarePlus } from "lucide-react";

interface Conversation {
  id: string;
  updated_at: string;
  otherUser: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  lastMessage: {
    content: string;
    created_at: string;
  } | null;
}

const Messages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setCurrentUserId(session.user.id);
      fetchConversations(session.user.id);
    }
  };

  const fetchConversations = async (userId: string) => {
    try {
      // Get user's conversations
      const { data: userConversations, error: convError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", userId);

      if (convError) throw convError;

      const conversationIds = userConversations?.map(c => c.conversation_id) || [];

      if (conversationIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get conversation details
      const conversationsData: Conversation[] = [];

      for (const convId of conversationIds) {
        // Get other participant
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select("user_id")
          .eq("conversation_id", convId)
          .neq("user_id", userId);

        if (!participants || participants.length === 0) continue;

        const otherUserId = participants[0].user_id;

        // Get other user's profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", otherUserId)
          .single();

        // Get last message
        const { data: messages } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: false })
          .limit(1);

        // Get conversation updated_at
        const { data: conversation } = await supabase
          .from("conversations")
          .select("updated_at")
          .eq("id", convId)
          .single();

        if (profile && conversation) {
          conversationsData.push({
            id: convId,
            updated_at: conversation.updated_at,
            otherUser: {
              id: otherUserId,
              username: profile.username,
              avatar_url: profile.avatar_url,
            },
            lastMessage: messages && messages.length > 0 ? messages[0] : null,
          });
        }
      }

      // Sort by updated_at
      conversationsData.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setConversations(conversationsData);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-safe">
      <Navigation />
      <main className="max-w-2xl mx-auto pt-16 sm:pt-20 px-3 sm:px-4 pb-20 sm:pb-24">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold fire-text">Správy</h1>
          <Button
            onClick={() => navigate("/search")}
            className="flex items-center gap-1.5 text-xs sm:text-sm h-8 sm:h-9"
          >
            <MessageSquarePlus size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Nová</span>
          </Button>
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-12 sm:py-20 px-4">
            <p className="text-muted-foreground text-base sm:text-lg">Žiadne správy</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Začnite konverzáciu vyhľadaním používateľov 💬
            </p>
            <Button
              onClick={() => navigate("/search")}
              className="mt-4 text-xs sm:text-sm h-8 sm:h-9"
              variant="outline"
            >
              Vyhľadať používateľov
            </Button>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {conversations.map((conversation) => (
              <Card
                key={conversation.id}
                className="p-3 sm:p-4 cursor-pointer hover:bg-muted/50 transition-colors touch-manipulation active:scale-[0.98]"
                onClick={() => navigate(`/messages/${conversation.id}`)}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-11 w-11 sm:h-12 sm:w-12">
                    <AvatarImage src={conversation.otherUser.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {conversation.otherUser.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base">{conversation.otherUser.username}</p>
                    {conversation.lastMessage && (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {conversation.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(conversation.lastMessage.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Messages;
