import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";

interface AddStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryAdded: () => void;
}

const AddStoryDialog = ({ open, onOpenChange, onStoryAdded }: AddStoryDialogProps) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [expiryHours, setExpiryHours] = useState(24);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 50MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an image or video",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to reels bucket (reusing for stories)
      const { error: uploadError } = await supabase.storage
        .from("reels")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("reels")
        .getPublicUrl(filePath);

      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + Math.min(expiryHours, 24));

      // Create story record
      const { error: dbError } = await supabase
        .from("stories")
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: file.type.startsWith('video/') ? 'video' : 'image',
          expires_at: expiresAt.toISOString(),
        });

      if (dbError) throw dbError;

      toast({
        title: "Story added",
        description: `Your story will be visible for ${expiryHours} hours`,
      });

      setFile(null);
      onStoryAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error uploading story:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="story-file">Image or Video</Label>
            <div className="mt-2">
              <label
                htmlFor="story-file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {file ? file.name : "Click to upload"}
                  </p>
                </div>
                <Input
                  id="story-file"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          <div>
            <Label htmlFor="expiry">Expires after (hours, max 24)</Label>
            <Input
              id="expiry"
              type="number"
              min="1"
              max="24"
              value={expiryHours}
              onChange={(e) => setExpiryHours(Math.min(24, Math.max(1, parseInt(e.target.value) || 24)))}
              className="mt-2"
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Add Story"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddStoryDialog;
