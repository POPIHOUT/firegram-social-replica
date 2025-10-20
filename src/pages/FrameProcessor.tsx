import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { removeBackground, loadImage } from "@/utils/backgroundRemoval";
import { Download, Loader2 } from "lucide-react";

const FRAME_FILES = [
  "candy", "diamond", "dinosaur", "dragon", "fire", "galaxy", "gold", "ice",
  "lightning", "magic", "minecraft", "music", "nature", "neon", "ocean",
  "rainbow", "sakura", "sport", "tech", "tribal"
];

const FrameProcessor = () => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedFrames, setProcessedFrames] = useState<{ name: string; blob: Blob }[]>([]);

  const processAllFrames = async () => {
    setProcessing(true);
    setProgress(0);
    setProcessedFrames([]);

    const processed: { name: string; blob: Blob }[] = [];

    for (let i = 0; i < FRAME_FILES.length; i++) {
      const frameName = FRAME_FILES[i];
      try {
        toast.info(`Spracovávam ${frameName}...`);
        
        // Load the frame
        const response = await fetch(`/frames/${frameName}.png`);
        const blob = await response.blob();
        const img = await loadImage(blob);
        
        // Remove background
        const processedBlob = await removeBackground(img);
        processed.push({ name: frameName, blob: processedBlob });
        
        toast.success(`${frameName} hotovo!`);
      } catch (error) {
        console.error(`Error processing ${frameName}:`, error);
        toast.error(`Chyba pri spracovaní ${frameName}`);
      }
      
      setProgress(((i + 1) / FRAME_FILES.length) * 100);
    }

    setProcessedFrames(processed);
    setProcessing(false);
    toast.success("Všetky rámčeky spracované!");
  };

  const downloadFrame = (frame: { name: string; blob: Blob }) => {
    const url = URL.createObjectURL(frame.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${frame.name}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    processedFrames.forEach(frame => {
      downloadFrame(frame);
    });
    toast.success("Sťahovanie všetkých rámčekov začalo!");
  };

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Odstránenie pozadia z rámčekov</h1>
          <p className="text-muted-foreground mt-2">
            Tento nástroj odstráni pozadie zo všetkých rámčekov a uloží ich ako transparentné PNG.
          </p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <Button 
              onClick={processAllFrames} 
              disabled={processing}
              size="lg"
              className="w-full"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Spracovávam...
                </>
              ) : (
                "Spracovať všetky rámčeky"
              )}
            </Button>

            {processing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  {Math.round(progress)}% hotovo
                </p>
              </div>
            )}

            {processedFrames.length > 0 && (
              <div className="pt-4 space-y-4">
                <Button 
                  onClick={downloadAll}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Stiahnuť všetky ({processedFrames.length})
                </Button>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {processedFrames.map((frame) => (
                    <Card key={frame.name} className="p-4 space-y-2">
                      <img 
                        src={URL.createObjectURL(frame.blob)} 
                        alt={frame.name}
                        className="w-full h-32 object-contain"
                      />
                      <Button
                        onClick={() => downloadFrame(frame)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Download className="mr-2 h-3 w-3" />
                        {frame.name}
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FrameProcessor;
