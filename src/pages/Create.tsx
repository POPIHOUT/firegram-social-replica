import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, X, Image as ImageIcon, Video as VideoIcon, Megaphone } from "lucide-react";
import FlameShopDialog from "@/components/FlameShopDialog";

const Create = () => {
  const [caption, setCaption] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadType, setUploadType] = useState<"images" | "video" | "advertisement">("images");
  const [adType, setAdType] = useState<"image" | "video">("image");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [userFlames, setUserFlames] = useState(0);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    // Fetch user flames
    const { data: profile } = await supabase
      .from("profiles")
      .select("flames")
      .eq("id", session.user.id)
      .single();
    
    if (profile) {
      setUserFlames(profile.flames);
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file for thumbnail",
        variant: "destructive",
      });
      return;
    }

    setThumbnail(file);
    const url = URL.createObjectURL(file);
    setThumbnailPreview(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    const isVideo = uploadType === "video" || (uploadType === "advertisement" && adType === "video");

    if (isVideo && files.length > 1) {
      toast({
        title: "Too many files",
        description: "You can only upload one video",
        variant: "destructive",
      });
      return;
    }

    // Check file types
    const validFiles = files.filter(file => {
      const isValidType = isVideo
        ? file.type.startsWith('video/') 
        : file.type.startsWith('image/');
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: isVideo
            ? `${file.name} is not a video`
            : `${file.name} is not an image`,
          variant: "destructive",
        });
      }
      return isValidType;
    });

    if (validFiles.length === 0) return;

    // Check file sizes
    const maxSize = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
    const oversizedFiles = validFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File is too large",
        description: isVideo
          ? "Video must be under 100MB"
          : "Each image must be under 15MB",
        variant: "destructive",
      });
      return;
    }

    if (isVideo) {
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

      const { error } = await supabase.storage
        .from('posts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

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

    const { error } = await supabase.storage
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

  const uploadThumbnail = async (userId: string): Promise<string | null> => {
    if (!thumbnail) return null;

    const fileExt = thumbnail.name.split('.').pop();
    const fileName = `thumbnails/${userId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('reels')
      .upload(fileName, thumbnail, {
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
        title: "No files",
        description: "Please select at least one file",
        variant: "destructive",
      });
      return;
    }

    // Check flames for advertisement
    if (uploadType === "advertisement") {
      const cost = adType === "image" ? 50 : 100;
      if (userFlames < cost) {
        toast({
          title: "Not enough flames",
          description: `You need ${cost} flames to create this advertisement. You have ${userFlames} flames.`,
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (uploadType === "advertisement") {
        const cost = adType === "image" ? 50 : 100;
        
        let mediaUrl: string;
        let thumbnailUrl: string | null = null;
        
        if (adType === "image") {
          const urls = await uploadImages(user.id);
          mediaUrl = urls[0];
        } else {
          mediaUrl = await uploadVideo(user.id);
          thumbnailUrl = await uploadThumbnail(user.id);
        }

        // Create advertisement
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { error: adError } = await supabase
          .from("advertisements")
          .insert({
            user_id: user.id,
            type: adType,
            media_url: mediaUrl,
            thumbnail_url: thumbnailUrl,
            caption: caption || null,
            website_url: websiteUrl || null,
            expires_at: expiresAt.toISOString(),
          });

        if (adError) throw adError;

        // Deduct flames
        const { error: flamesError } = await supabase
          .from("profiles")
          .update({ flames: userFlames - cost })
          .eq("id", user.id);

        if (flamesError) throw flamesError;

        toast({
          title: "Advertisement created!",
          description: "Your ad is pending approval and will be reviewed by our team 🔥",
        });

        setUserFlames(userFlames - cost);
      } else if (uploadType === "images") {
        const imageUrls = await uploadImages(user.id);

        const { error } = await supabase.from("posts").insert({
          user_id: user.id,
          image_url: imageUrls[0],
          images: imageUrls,
          caption: caption || null,
        });

        if (error) throw error;

        toast({
          title: "Post created!",
          description: `Your post with ${imageUrls.length} ${imageUrls.length === 1 ? 'image' : 'images'} has been created 🔥`,
        });
      } else {
        const videoUrl = await uploadVideo(user.id);
        const thumbnailUrl = await uploadThumbnail(user.id);

        const { error } = await supabase.from("reels").insert({
          user_id: user.id,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          caption: caption || null,
        });

        if (error) throw error;

        toast({
          title: "Video created!",
          description: "Your video has been uploaded successfully 🔥",
        });
      }

      previewUrls.forEach(url => URL.revokeObjectURL(url));
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
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
    <div className="min-h-screen pb-safe">
      <Navigation />
      <main className="max-w-2xl mx-auto pt-16 sm:pt-20 px-3 sm:px-4 pb-20 sm:pb-24">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold fire-text">Create Content</h1>
          <button
            onClick={() => setShopDialogOpen(true)}
            className="flex items-center gap-2 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20 hover:bg-orange-500/20 transition-colors cursor-pointer"
          >
            <span className="text-xl">🔥</span>
            <span className="font-bold text-base sm:text-lg">{userFlames}</span>
          </button>
        </div>

        <Card className="p-4 sm:p-6 border-border bg-card">
          <Tabs value={uploadType} onValueChange={(v) => {
            setUploadType(v as "images" | "video" | "advertisement");
            setSelectedFiles([]);
            previewUrls.forEach(url => URL.revokeObjectURL(url));
            setPreviewUrls([]);
            setThumbnail(null);
            if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
            setThumbnailPreview("");
          }}>
            <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6">
              <TabsTrigger value="images" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Images
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <VideoIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Video
              </TabsTrigger>
              <TabsTrigger value="advertisement" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                <Megaphone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Ad
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
                  Uploading...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Create Post
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="video">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Upload Video</label>
                {selectedFiles.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Video selected
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
                    Click to select video
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

              <div className="space-y-2">
                <Label htmlFor="thumbnail-upload" className="text-sm font-medium">
                  Thumbnail (Optional)
                </Label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailSelect}
                    className="hidden"
                    id="thumbnail-upload"
                  />
                  <label
                    htmlFor="thumbnail-upload"
                    className="flex items-center justify-center gap-2 w-full px-4 py-4 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/80 transition-all cursor-pointer"
                  >
                    <Upload className="text-muted-foreground" size={20} />
                    <span className="text-muted-foreground text-sm">
                      Click to select thumbnail
                    </span>
                  </label>
                </div>

                {thumbnailPreview && (
                  <div className="relative">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-full rounded-lg border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(thumbnailPreview);
                        setThumbnail(null);
                        setThumbnailPreview("");
                      }}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
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
                  Uploading...
                </>
              ) : (
                <>
                  <VideoIcon className="mr-2 h-4 w-4" />
                  Create Video
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="advertisement">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-xl">🔥</span> Advertisement Pricing
            </h3>
            <ul className="space-y-1 text-sm">
              <li>• Image Ad: 50 flames (7 days)</li>
              <li>• Video Ad: 100 flames (7 days)</li>
            </ul>
          </div>

          <Tabs value={adType} onValueChange={(v) => {
            setAdType(v as "image" | "video");
            setSelectedFiles([]);
            previewUrls.forEach(url => URL.revokeObjectURL(url));
            setPreviewUrls([]);
            setThumbnail(null);
            if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
            setThumbnailPreview("");
          }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="image">Image (50 🔥)</TabsTrigger>
              <TabsTrigger value="video">Video (100 🔥)</TabsTrigger>
            </TabsList>

            <TabsContent value="image">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="ad-image-upload" className="text-sm font-medium">
                    Upload Image
                  </Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="ad-image-upload"
                    />
                    <label
                      htmlFor="ad-image-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-8 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/80 transition-all cursor-pointer"
                    >
                      <Upload className="text-muted-foreground" size={24} />
                      <span className="text-muted-foreground font-medium">
                        Click to select image
                      </span>
                    </label>
                  </div>

                  {previewUrls.length > 0 && (
                    <div className="relative">
                      <img
                        src={previewUrls[0]}
                        alt="Preview"
                        className="w-full rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(0)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="ad-caption">Caption</Label>
                  <Textarea
                    id="ad-caption"
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="min-h-[100px] bg-muted border-border focus:border-primary resize-none mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="ad-website">Website URL (Optional)</Label>
                  <input
                    id="ad-website"
                    type="url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:border-primary focus:outline-none mt-2"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || selectedFiles.length === 0 || userFlames < 50}
                  className="w-full fire-gradient hover:opacity-90 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Advertisement (50 🔥)"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="video">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label htmlFor="ad-video-upload" className="text-sm font-medium">
                    Upload Video
                  </Label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="ad-video-upload"
                    />
                    <label
                      htmlFor="ad-video-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-8 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/80 transition-all cursor-pointer"
                    >
                      <Upload className="text-muted-foreground" size={24} />
                      <span className="text-muted-foreground font-medium">
                        Click to select video
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
                        onClick={() => removeFile(0)}
                        className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="ad-thumbnail-upload" className="text-sm font-medium">
                      Thumbnail (Optional)
                    </Label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailSelect}
                        className="hidden"
                        id="ad-thumbnail-upload"
                      />
                      <label
                        htmlFor="ad-thumbnail-upload"
                        className="flex items-center justify-center gap-2 w-full px-4 py-4 bg-muted border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/80 transition-all cursor-pointer"
                      >
                        <Upload className="text-muted-foreground" size={20} />
                        <span className="text-muted-foreground text-sm">
                          Click to select thumbnail
                        </span>
                      </label>
                    </div>

                    {thumbnailPreview && (
                      <div className="relative">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="w-full rounded-lg border border-border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            URL.revokeObjectURL(thumbnailPreview);
                            setThumbnail(null);
                            setThumbnailPreview("");
                          }}
                          className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1.5"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="ad-video-caption">Caption</Label>
                  <Textarea
                    id="ad-video-caption"
                    placeholder="Write a caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="min-h-[100px] bg-muted border-border focus:border-primary resize-none mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="ad-video-website">Website URL (Optional)</Label>
                  <input
                    id="ad-video-website"
                    type="url"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:border-primary focus:outline-none mt-2"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || selectedFiles.length === 0 || userFlames < 100}
                  className="w-full fire-gradient hover:opacity-90 font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Advertisement (100 🔥)"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </TabsContent>
          </Tabs>
        </Card>
        <FlameShopDialog open={shopDialogOpen} onOpenChange={setShopDialogOpen} />
      </main>
    </div>
  );
};

export default Create;
