import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, X } from "lucide-react";

const Create = () => {
  const [caption, setCaption] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const addImageUrl = () => {
    setImageUrls([...imageUrls, ""]);
  };

  const removeImageUrl = (index: number) => {
    if (imageUrls.length > 1) {
      setImageUrls(imageUrls.filter((_, i) => i !== index));
    }
  };

  const updateImageUrl = (index: number, value: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validUrls = imageUrls.filter(url => url.trim() !== "");
    
    if (validUrls.length === 0) {
      toast({
        title: "Error",
        description: "Please provide at least one image URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: validUrls[0], // Keep first image as primary for backward compatibility
        images: validUrls,
        caption: caption,
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Your post with ${validUrls.length} ${validUrls.length === 1 ? 'image' : 'images'} has been created 🔥`,
      });
      navigate("/feed");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="max-w-2xl mx-auto pt-20 px-4 pb-24">
        <Card className="p-6 border-border bg-card">
          <h1 className="text-2xl font-bold mb-6 fire-text">Create New Post</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Image URLs</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addImageUrl}
                  className="text-xs"
                >
                  + Add Image
                </Button>
              </div>
              
              {imageUrls.map((url, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative">
                    <input
                      type="url"
                      placeholder={`Image URL ${index + 1}`}
                      value={url}
                      onChange={(e) => updateImageUrl(index, e.target.value)}
                      className="w-full px-4 py-3 pr-20 bg-muted border border-border rounded-lg focus:border-primary focus:outline-none transition-colors"
                    />
                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      {imageUrls.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeImageUrl(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X size={20} />
                        </button>
                      )}
                      <Upload className="text-muted-foreground" size={20} />
                    </div>
                  </div>
                  
                  {url && (
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full aspect-square object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Caption</label>
              <Textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[100px] bg-muted border-border focus:border-primary resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full fire-gradient hover:opacity-90 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Post"
              )}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default Create;
