import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  currentIndex: number;
  onNavigate: (direction: "prev" | "next") => void;
}

const ImageViewerDialog = ({
  open,
  onOpenChange,
  images,
  currentIndex,
  onNavigate,
}: ImageViewerDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none max-h-none w-screen h-screen p-0 bg-black/95 border-0 overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
          onClick={() => onOpenChange(false)}
        >
          <X className="w-6 h-6" />
        </Button>

        <div className="relative w-full h-full flex items-center justify-center p-16">
          <img
            src={images[currentIndex]}
            alt="Full screen view"
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 text-white hover:bg-white/20"
                onClick={() => onNavigate("prev")}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 text-white hover:bg-white/20"
                onClick={() => onNavigate("next")}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewerDialog;
