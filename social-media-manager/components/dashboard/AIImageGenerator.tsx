/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const styles = [
  "Photorealistic",
  "Digital Art",
  "Oil Painting",
  "Watercolor",
  "Sketch",
  "Anime",
  "Cyberpunk",
  "Minimalist",
  "Abstract",
];

export default function AIImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Photorealistic");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentImages, setRecentImages] = useState<
    Array<{ id: string; url: string; prompt: string }>
  >([]);

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt describing the image you want");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedImage(data.image.url);
        setRecentImages((prev) => [data.image, ...prev].slice(0, 6));
        toast.success("Image generated successfully!");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyImageUrl = () => {
    if (generatedImage) {
      navigator.clipboard.writeText(generatedImage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Image URL copied!");
    }
  };

  const downloadImage = async () => {
    if (generatedImage) {
      try {
        const response = await fetch(generatedImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ai-image-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("Image downloaded!");
      } catch (error) {
        toast.error("Failed to download image");
      }
    }
  };

  const useImageInPost = () => {
    if (generatedImage) {
      // Store in localStorage or pass to parent component
      localStorage.setItem("lastGeneratedImage", generatedImage);
      toast.success("Image ready to use in your post!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Generator Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Image Generator
          </CardTitle>
          <CardDescription>
            Create custom images for your social media posts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Image Description (Prompt)</Label>
            <Input
              placeholder="e.g., A modern office with people working on laptops, sunny day, professional atmosphere"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Be specific for best results. Describe the scene, style, mood, and
              details.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Art Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {styles.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                onClick={generateImage}
                disabled={isGenerating || !prompt.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Image
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Generated Image Display */}
          {generatedImage && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-sm font-medium mb-3">Generated Image:</p>
              <div className="relative group">
                <img
                  src={generatedImage}
                  alt="AI Generated"
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <Button size="sm" variant="secondary" onClick={copyImageUrl}>
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={downloadImage}>
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-center mt-3">
                <Button onClick={useImageInPost} variant="outline" size="sm">
                  Use in My Post
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Prompt: {prompt}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Images */}
      {recentImages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Generated</CardTitle>
            <CardDescription>Your recently created images</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recentImages.map((img) => (
                <div
                  key={img.id}
                  className="relative group cursor-pointer border rounded-lg overflow-hidden"
                  onClick={() => setGeneratedImage(img.url)}
                >
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
