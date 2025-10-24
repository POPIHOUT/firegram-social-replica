import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MessageSquare } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface Reply {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

export const SupportManagement = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyMessage, setReplyMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchReplies(selectedTicket.id);
    }
  }, [selectedTicket]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("support_tickets" as any)
        .select("*, profiles!support_tickets_user_id_fkey(username, avatar_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchReplies = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from("support_replies" as any)
        .select("*, profiles!support_replies_user_id_fkey(username, avatar_url)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReplies((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsReplying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("support_replies" as any)
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          message: replyMessage.trim(),
          is_admin: true,
        });

      if (error) throw error;

      toast({
        title: "Úspech",
        description: "Odpoveď bola odoslaná.",
      });

      setReplyMessage("");
      await fetchReplies(selectedTicket.id);
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReplying(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("support_tickets" as any)
        .update({ status })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      toast({
        title: "Úspech",
        description: "Status tiketu bol aktualizovaný.",
      });

      setSelectedTicket({ ...selectedTicket, status });
      await fetchTickets();
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      open: "destructive",
      in_progress: "default",
      resolved: "secondary",
      closed: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
      urgent: "destructive",
    };
    return <Badge variant={variants[priority] || "default"}>{priority}</Badge>;
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket) => (
          <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTicket(ticket)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{ticket.subject}</CardTitle>
                {getStatusBadge(ticket.status)}
              </div>
              <CardDescription className="flex items-center justify-between">
                <span>@{ticket.profiles.username}</span>
                {getPriorityBadge(ticket.priority)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {ticket.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
            <DialogDescription>
              Od: @{selectedTicket?.profiles.username} • {selectedTicket && formatDistanceToNow(new Date(selectedTicket.created_at), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Original Message */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm">{selectedTicket?.description}</p>
              </CardContent>
            </Card>

            {/* Replies */}
            {replies.map((reply) => (
              <Card key={reply.id} className={reply.is_admin ? "bg-primary/5" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 mt-1" />
                    <div>
                      <p className="text-sm font-medium">
                        @{reply.profiles.username}
                        {reply.is_admin && <Badge className="ml-2" variant="secondary">Admin</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm">{reply.message}</p>
                </CardContent>
              </Card>
            ))}

            {/* Reply Form */}
            <div className="space-y-2">
              <Textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Napíš odpoveď..."
                rows={4}
              />
            </div>

            {/* Status Update */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status:</label>
              <Select
                value={selectedTicket?.status}
                onValueChange={handleUpdateStatus}
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTicket(null)}>
              Zavrieť
            </Button>
            <Button onClick={handleReply} disabled={!replyMessage.trim() || isReplying}>
              {isReplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Odoslať odpoveď
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};