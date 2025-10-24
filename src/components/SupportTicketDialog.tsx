import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SupportTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupportTicketDialog = ({ open, onOpenChange }: SupportTicketDialogProps) => {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast({
        title: "Chyba",
        description: "Vyplň všetky polia.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("support_tickets" as any)
        .insert({
          user_id: user.id,
          subject: subject.trim(),
          description: description.trim(),
          priority,
        });

      if (error) throw error;

      toast({
        title: "Úspech",
        description: "Tvoj support tiket bol odoslaný.",
      });

      setSubject("");
      setDescription("");
      setPriority("medium");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa vytvoriť tiket. Skús to prosím znova.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nový Support Tiket</DialogTitle>
          <DialogDescription>
            Popíš svoj problém a náš tím ti pomôže čo najskôr.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Predmet</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Krátky popis problému"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priorita</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Nízka</SelectItem>
                <SelectItem value="medium">Stredná</SelectItem>
                <SelectItem value="high">Vysoká</SelectItem>
                <SelectItem value="urgent">Urgentná</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Popis problému</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Podrobne popíš čo sa stalo..."
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/2000
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zrušiť
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Odoslať
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};