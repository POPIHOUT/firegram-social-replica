import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Send } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface CommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
  reelId?: string;
  onCommentAdded: () => void;
}

const CommentsDialog = ({ open, onOpenChange, postId, reelId, onCommentAdded }: CommentsDialogProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, postId, reelId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from("comments")
        .select(`
          *,
          profiles (
            username,
            avatar_url
          )
        `);
      
      if (postId) {
        query = query.eq("post_id", postId);
      } else if (reelId) {
        query = query.eq("reel_id", reelId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa načítať komentáre",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const commentData: any = {
        content: newComment.trim(),
        user_id: user.id,
      };

      if (postId) {
        commentData.post_id = postId;
      } else if (reelId) {
        commentData.reel_id = reelId;
      }

      const { error: insertError } = await supabase
        .from("comments")
        .insert(commentData);

      if (insertError) throw insertError;

      // Update comments count
      if (postId) {
        const { data: post } = await supabase
          .from("posts")
          .select("comments_count")
          .eq("id", postId)
          .single();

        await supabase
          .from("posts")
          .update({ comments_count: (post?.comments_count || 0) + 1 })
          .eq("id", postId);
      } else if (reelId) {
        const { data: reel } = await supabase
          .from("reels")
          .select("comments_count")
          .eq("id", reelId)
          .single();

        await supabase
          .from("reels")
          .update({ comments_count: (reel?.comments_count || 0) + 1 })
          .eq("id", reelId);
      }

      setNewComment("");
      await fetchComments();
      onCommentAdded();

      toast({
        title: "Úspech",
        description: "Komentár bol pridaný",
      });
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: "Chyba",
        description: error.message || "Nepodarilo sa pridať komentár",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Komentáre</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zatiaľ žiadne komentáre. Buďte prvý!
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={comment.profiles.avatar_url} />
                    <AvatarFallback className="bg-muted">
                      {comment.profiles.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">
                        {comment.profiles.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmitComment} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Pridať komentár..."
              disabled={submitting}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!newComment.trim() || submitting}
              size="icon"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsDialog;
