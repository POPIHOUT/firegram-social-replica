import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, X, Image as ImageIcon, Video as VideoIcon } from "lucide-react";

const Create = () => {
  const [caption, setCaption] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadType, setUploadType] = useState<"images" | "video">("images");
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    if (uploadType === "video" && files.length > 1) {
      toast({
        title: "Príliš veľa súborov",
        description: "Môžete nahrať len jedno video",
        variant: "destructive",
      });
      return;
    }

    // Check file types
    const validFiles = files.filter(file => {
      const isValidType = uploadType === "images" 
        ? file.type.startsWith('image/') 
        : file.type.startsWith('video/');
      
      if (!isValidType) {
        toast({
          title: "Neplatný typ súboru",
          description: uploadType === "images" 
            ? `${file.name} nie je obrázok`
            : `${file.name} nie je video`,
          variant: "destructive",
        });
      }
      return isValidType;
    });

    if (validFiles.length === 0) return;

    // Check file sizes
    const maxSize = uploadType === "images" ? 15 * 1024 * 1024 : 100 * 1024 * 1024;
    const oversizedFiles = validFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Súbor je príliš veľký",
        description: uploadType === "images"
          ? "Každý obrázok musí byť pod 15MB"
          : "Video musí byť pod 100MB",
        variant: "destructive",
      });
      return;
    }

    if (uploadType === "video") {
      setSelectedFiles([validFiles[0]]);
      setPreviewUrls([URL.createObjectURL(validFiles[0])]);
    } else {
      const newFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newFiles);
      const newPreviewUrls = validFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls([...previewUrls, ...newPreviewUrls]);
    }
  };

  const removeFile = (index: number) => {
    // Revoke the preview URL to free up memory
    URL.revokeObjectURL(previewUrls[index]);
    
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviews);
  };

  const uploadImages = async (userId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${i}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('posts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const uploadVideo = async (userId: string): Promise<string> => {
    const file = selectedFiles[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('reels')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('reels')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      toast({
        title: "Žiadne súbory",
        description: uploadType === "images" 
          ? "Vyberte prosím aspoň jeden obrázok"
          : "Vyberte prosím video",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (uploadType === "images") {
        const imageUrls = await uploadImages(user.id);

        const { error } = await supabase.from("posts").insert({
          user_id: user.id,
          image_url: imageUrls[0],
          images: imageUrls,
          caption: caption || null,
        });

        if (error) throw error;

        toast({
          title: "Post vytvorený!",
          description: `Váš post s ${imageUrls.length} ${imageUrls.length === 1 ? 'obrázkom' : 'obrázkami'} bol vytvorený 🔥`,
        });
      } else {
        const videoUrl = await uploadVideo(user.id);

        const { error } = await supabase.from("reels").insert({
          user_id: user.id,
          video_url: videoUrl,
          caption: caption || null,
        });

        if (error) throw error;

        toast({
          title: "Video vytvorené!",
          description: "Vaše video bolo úspešne nahrané 🔥",
        });
      }

      previewUrls.forEach(url => URL.revokeObjectURL(url));
      navigate("/feed");
    } catch (error: any) {
      toast({
        title: "Chyba",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-safe">
      <Navigation />
      <main className="max-w-2xl mx-auto pt-16 sm:pt-20 px-3 sm:px-4 pb-20 sm:pb-24">
        <Card className="p-4 sm:p-6 border-border bg-card">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 fire-text">Vytvoriť obsah</h1>
          
          <Tabs value={uploadType} onValueChange={(v) => {
            setUploadType(v as "images" | "video");
            setSelectedFiles([]);
            previewUrls.forEach(url => URL.revokeObjectURL(url));
            setPreviewUrls([]);
          }}>
            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
              <TabsTrigger value="images" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Obrázky
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <VideoIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Video
              </TabsTrigger>
            </TabsList>

            <TabsContent value="images">
              <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Upload Images</label>
                <span className="text-xs text-muted-foreground">
                  {selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              
              {/* File Input Button */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/80 transition-all cursor-pointer"
                >
                  <Upload className="text-muted-foreground" size={24} />
                  <span className="text-muted-foreground font-medium">
                    Click to select images
                  </span>
                </label>
              </div>

              {/* Image Previews */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="rounded-lg overflow-hidden border border-border">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full aspect-square object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={16} />
                      </button>
                      {index === 0 && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          Cover
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
              disabled={loading || selectedFiles.length === 0}
              className="w-full fire-gradient hover:opacity-90 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Nahrávam...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Vytvoriť post
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="video">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Nahrať video</label>
                {selectedFiles.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Video vybrané
                  </span>
                )}
              </div>
              
              <div className="relative">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/80 transition-all cursor-pointer"
                >
                  <Upload className="text-muted-foreground" size={24} />
                  <span className="text-muted-foreground font-medium">
                    Kliknite pre výber videa
                  </span>
                </label>
              </div>

              {previewUrls.length > 0 && (
                <div className="relative">
                  <div className="rounded-lg overflow-hidden border border-border bg-black">
                    <video
                      src={previewUrls[0]}
                      controls
                      className="w-full aspect-video object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(previewUrls[0]);
                      setSelectedFiles([]);
                      setPreviewUrls([]);
                    }}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Popis</label>
              <Textarea
                placeholder="Napíšte popis..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="min-h-[100px] bg-muted border-border focus:border-primary resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || selectedFiles.length === 0}
              className="w-full fire-gradient hover:opacity-90 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Nahrávam...
                </>
              ) : (
                <>
                  <VideoIcon className="mr-2 h-4 w-4" />
                  Vytvoriť video
                </>
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
        </Card>
      </main>
    </div>
  );
};

export default Create;
