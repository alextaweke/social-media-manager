/* eslint-disable react-hooks/immutability */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Loader2,
  ImagePlus,
  Hash,
  Calendar,
  Send,
  Save,
  Trash2,
  Clock,
  X,
  Upload,
  Wand2,
  Type,
  Minus,
  Plus,
  Copy,
  Check,
  Brain,
} from "lucide-react";
import { toast } from "sonner";

interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
}

interface MediaFile {
  id?: string;
  file: File;
  preview: string;
  type: "image" | "video" | "gif";
  uploading: boolean;
  url?: string;
}

interface EnhancementResult {
  original: string;
  enhanced: string;
  action: string;
}

export default function PostComposer() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "twitter",
    "instagram",
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [content, setContent] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeTab, setActiveTab] = useState("write");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [savedMedia, setSavedMedia] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Enhancement States
  const [showAIEnhancer, setShowAIEnhancer] = useState(false);
  const [enhancementResult, setEnhancementResult] =
    useState<EnhancementResult | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiTone, setAiTone] = useState("engaging");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Load saved AI generated image from localStorage
  useEffect(() => {
    const savedImage = localStorage.getItem("lastGeneratedImage");
    if (savedImage && !mediaFiles.some((m) => m.url === savedImage)) {
      setGeneratedImage(savedImage);
    }
  }, []);

  const platforms: Platform[] = [
    {
      id: "twitter",
      name: "Twitter",
      icon: "🐦",
      color: "bg-blue-400",
      connected: true,
    },
    {
      id: "instagram",
      name: "Instagram",
      icon: "📸",
      color: "bg-pink-500",
      connected: true,
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: "💼",
      color: "bg-blue-700",
      connected: false,
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: "👍",
      color: "bg-blue-600",
      connected: true,
    },
    {
      id: "telegram",
      name: "Telegram",
      icon: "🤖",
      color: "bg-blue-500",
      connected: true,
    },
  ];

  // AI Content Generation
  const generateAIContent = async () => {
    if (!aiTopic) {
      toast.error("Please enter a topic");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform first");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic,
          platform: selectedPlatforms[0],
          tone: aiTone,
          includeHashtags: true,
          length: "medium",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setContent(data.content);
        toast.success("AI content generated! You can edit it below.");
        setActiveTab("write");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error("Failed to generate content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Enhancement Actions
  const enhanceContent = async (action: string) => {
    if (!content.trim()) {
      toast.error("Please add some content to enhance");
      return;
    }

    setIsEnhancing(true);
    try {
      const response = await fetch("/api/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: content,
          platform: selectedPlatforms[0] || "general",
          tone: aiTone,
          action,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEnhancementResult({
          original: data.original,
          enhanced: data.enhanced,
          action,
        });
        toast.success("Content enhanced! Review the result below.");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to enhance content");
    } finally {
      setIsEnhancing(false);
    }
  };

  const applyEnhancement = () => {
    if (enhancementResult) {
      setContent(enhancementResult.enhanced);
      setEnhancementResult(null);
      toast.success("Enhancement applied!");
    }
  };

  // AI Image Generation
  const generateImageForPost = async () => {
    if (!content.trim() && !aiTopic) {
      toast.error("Please add content or a topic to generate an image");
      return;
    }

    const prompt = aiTopic || content.substring(0, 100);

    setIsGeneratingImage(true);
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          style: "photorealistic",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedImage(data.image.url);
        // Save to localStorage for persistence
        localStorage.setItem("lastGeneratedImage", data.image.url);
        toast.success("Image generated! You can add it to your post.");
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate image");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const addGeneratedImageToPost = () => {
    if (generatedImage) {
      // Add as media file
      const newMedia: MediaFile = {
        id: Date.now().toString(),
        file: new File([], "ai-generated-image.jpg"),
        preview: generatedImage,
        type: "image",
        uploading: false,
        url: generatedImage,
      };
      setMediaFiles((prev) => [...prev, newMedia]);
      setGeneratedImage(null);
      localStorage.removeItem("lastGeneratedImage");
      toast.success("Image added to your post!");
    }
  };

  // Media Upload Functions
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: MediaFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const preview = URL.createObjectURL(file);
        newFiles.push({
          file,
          preview,
          type: file.type.startsWith("image/") ? "image" : "video",
          uploading: true,
        });
      }
    }
    setMediaFiles((prev) => [...prev, ...newFiles]);
    uploadFiles(newFiles);
  }, []);

  const uploadFiles = async (files: MediaFile[]) => {
    for (const mediaFile of files) {
      const formData = new FormData();
      formData.append("file", mediaFile.file);

      try {
        const response = await fetch("/api/media/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (data.success) {
          setMediaFiles((prev) =>
            prev.map((f) =>
              f.preview === mediaFile.preview
                ? {
                    ...f,
                    uploading: false,
                    url: data.file.url,
                    id: data.file.id,
                  }
                : f,
            ),
          );
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        setMediaFiles((prev) =>
          prev.filter((f) => f.preview !== mediaFile.preview),
        );
        toast.error(`Failed to upload: ${mediaFile.file.name}`);
      }
    }
  };

  const removeMedia = (index: number) => {
    const media = mediaFiles[index];
    if (media.preview) {
      URL.revokeObjectURL(media.preview);
    }
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchSavedMedia = async () => {
    try {
      const response = await fetch("/api/media/list");
      const data = await response.json();
      if (data.success) {
        setSavedMedia(data.media);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    }
  };

  const addSavedMedia = (media: any) => {
    setMediaFiles((prev) => [
      ...prev,
      {
        id: media.id,
        file: new File([], media.file_name),
        preview: media.file_url,
        type: media.file_type,
        uploading: false,
        url: media.file_url,
      },
    ]);
    setShowMediaLibrary(false);
    toast.success("Media added to post");
  };

  const handlePublish = async () => {
    if (!content.trim()) {
      toast.error("Please add some content before publishing");
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform to publish to");
      return;
    }

    if (mediaFiles.some((m) => m.uploading)) {
      toast.error("Please wait for media to finish uploading");
      return;
    }

    setIsPublishing(true);
    try {
      const mediaUrls = mediaFiles.filter((m) => m.url).map((m) => m.url);

      const response = await fetch("/api/social/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          platforms: selectedPlatforms,
          mediaUrls,
          scheduleFor: scheduleDate || null,
          aiGenerated: activeTab === "ai",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(
          data.scheduled
            ? "Post scheduled successfully!"
            : "Post published successfully!",
        );
        // Reset form
        setContent("");
        setSelectedPlatforms(["twitter", "instagram"]);
        setScheduleDate("");
        setShowScheduler(false);
        setMediaFiles([]);
        setEnhancementResult(null);
        setGeneratedImage(null);
        localStorage.removeItem("lastGeneratedImage");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(
        "Failed to publish. Please check your connections and try again.",
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      if (selectedPlatforms.length === 1) {
        toast.error("You must select at least one platform");
        return;
      }
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platformId));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platformId]);
    }
  };

  const enhancementActions = [
    { id: "enhance", label: "✨ Enhance", icon: Sparkles, action: "enhance" },
    {
      id: "grammar",
      label: "📝 Grammar",
      icon: Wand2,
      action: "improve_grammar",
    },
    { id: "shorter", label: "📏 Shorter", icon: Minus, action: "make_shorter" },
    { id: "longer", label: "📖 Longer", icon: Plus, action: "make_longer" },
    {
      id: "hashtags",
      label: "#️⃣ Hashtags",
      icon: Hash,
      action: "add_hashtags",
    },
  ];

  return (
    <Card className="w-full shadow-lg border-0">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <CardTitle className="text-2xl">Create New Post</CardTitle>
        <CardDescription className="text-blue-100">
          Craft engaging content and share it across your social networks
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="write">✍️ Write Post</TabsTrigger>
            <TabsTrigger value="ai">🤖 AI Assistant</TabsTrigger>
            <TabsTrigger value="enhance">✨ Enhance</TabsTrigger>
          </TabsList>

          {/* Write Tab */}
          <TabsContent value="write" className="space-y-6">
            {/* Platform Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Select Platforms</Label>
              <div className="flex flex-wrap gap-3">
                {platforms.map((platform) => (
                  <Button
                    key={platform.id}
                    type="button"
                    variant={
                      selectedPlatforms.includes(platform.id)
                        ? "default"
                        : "outline"
                    }
                    className={`gap-2 ${
                      selectedPlatforms.includes(platform.id)
                        ? platform.color
                        : ""
                    }`}
                    onClick={() => togglePlatform(platform.id)}
                    disabled={!platform.connected}
                  >
                    <span>{platform.icon}</span>
                    {platform.name}
                    {!platform.connected && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Connect
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Media Upload Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">Media</Label>
                <div className="flex gap-2">
                  <Dialog
                    open={showMediaLibrary}
                    onOpenChange={setShowMediaLibrary}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchSavedMedia}
                      >
                        <ImagePlus className="h-4 w-4 mr-1" />
                        Library
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Media Library</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-3 gap-4 p-4">
                        {savedMedia.map((media) => (
                          <div
                            key={media.id}
                            className="relative group cursor-pointer border rounded-lg overflow-hidden hover:shadow-lg transition"
                            onClick={() => addSavedMedia(media)}
                          >
                            {media.file_type === "image" ? (
                              <img
                                src={media.file_url}
                                alt={media.file_name}
                                className="w-full h-32 object-cover"
                              />
                            ) : (
                              <video
                                src={media.file_url}
                                className="w-full h-32 object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <Plus className="h-8 w-8 text-white" />
                            </div>
                          </div>
                        ))}
                        {savedMedia.length === 0 && (
                          <div className="col-span-3 text-center py-12 text-gray-500">
                            No media found. Upload some images or videos first.
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
              </div>

              {/* AI Generated Image Display */}
              {generatedImage && (
                <div className="relative border rounded-lg p-3 bg-purple-50 dark:bg-purple-950/20">
                  <div className="flex items-center gap-3">
                    <img
                      src={generatedImage}
                      alt="AI Generated"
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">AI Generated Image</p>
                      <p className="text-xs text-gray-500">
                        Generated based on your content
                      </p>
                    </div>
                    <Button size="sm" onClick={addGeneratedImageToPost}>
                      Add to Post
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setGeneratedImage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  mediaFiles.length > 0
                    ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                    : "border-gray-300 hover:border-blue-500"
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileSelect(e.dataTransfer.files);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />

                {mediaFiles.length === 0 ? (
                  <div className="text-center">
                    <ImagePlus className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-500 mb-2">
                      Drag & drop images/videos here or click to upload
                    </p>
                    <p className="text-xs text-gray-400">
                      Supports: JPG, PNG, GIF, MP4 (Max 10MB per file)
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {mediaFiles.map((media, index) => (
                      <div key={index} className="relative group">
                        {media.type === "image" ? (
                          <img
                            src={media.preview}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        ) : (
                          <video
                            src={media.preview}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                        )}
                        {media.uploading && (
                          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                          </div>
                        )}
                        <button
                          onClick={() => removeMedia(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center hover:border-blue-500 transition"
                    >
                      <Plus className="h-6 w-6 text-gray-400" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content Editor */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Post Content</Label>
              <Textarea
                placeholder="What's on your mind? Share your thoughts with your audience..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[200px] resize-none"
              />
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <span>{content.length} characters</span>
                  {content.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.ceil(content.length / 280)}{" "}
                      {selectedPlatforms.includes("twitter")
                        ? "tweets"
                        : "posts"}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="ai" className="space-y-6">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-800 rounded-lg p-6">
              <div className="text-center mb-4">
                <Brain className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">
                  AI Content Generator
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Generate engaging content in seconds
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Topic / Keyword</Label>
                  <Input
                    placeholder="e.g., Digital marketing trends, Product launch, Industry news"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Tone of Voice</Label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="professional">
                      Professional & Informative
                    </option>
                    <option value="engaging">Casual & Engaging</option>
                    <option value="humorous">Humorous & Witty</option>
                    <option value="inspirational">
                      Inspirational & Motivational
                    </option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    onClick={generateAIContent}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Post
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={generateImageForPost}
                    disabled={isGeneratingImage}
                  >
                    {isGeneratingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    <span className="ml-1">Generate Image</span>
                  </Button>
                </div>
              </div>
            </div>

            {content && (
              <div className="space-y-3">
                <Label>Generated Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[150px]"
                />
                <p className="text-xs text-gray-500 text-right">
                  You can edit the generated content above
                </p>
              </div>
            )}
          </TabsContent>

          {/* Enhance Tab */}
          <TabsContent value="enhance" className="space-y-6">
            <div className="grid gap-4">
              {enhancementActions.map((action) => {
                // 1. Assign the icon to a capitalized variable name
                const IconComponent = action.icon;

                return (
                  <Button
                    key={action.id}
                    variant="outline"
                    className="h-auto py-4 justify-start gap-3"
                    onClick={() => enhanceContent(action.action)}
                    disabled={isEnhancing || !content.trim()}
                  >
                    {/* 2. Render it using JSX tags instead of curly braces */}
                    <IconComponent className="h-5 w-5" />

                    <div className="text-left">
                      <p className="font-medium">{action.label}</p>
                      <p className="text-xs text-gray-500">
                        {action.id === "enhance" &&
                          "Make your content more engaging and polished"}
                        {action.id === "grammar" &&
                          "Fix grammar and improve readability"}
                        {action.id === "shorter" &&
                          "Condense for platforms like Twitter"}
                        {action.id === "longer" &&
                          "Expand with more details and value"}
                        {action.id === "hashtags" &&
                          "Generate relevant hashtags for your content"}
                      </p>
                    </div>
                    {isEnhancing && action.id === enhancementResult?.action && (
                      <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Enhancement Result */}
            {enhancementResult && (
              <div className="mt-6 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    Enhanced Result
                  </h4>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={applyEnhancement}>
                      <Check className="h-4 w-4 mr-1" />
                      Apply
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Original:</p>
                    <p className="text-sm p-2 bg-white dark:bg-gray-800 rounded">
                      {enhancementResult.original}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600 mb-1">Enhanced:</p>
                    <p className="text-sm p-2 bg-white dark:bg-gray-800 rounded">
                      {enhancementResult.enhanced}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!content.trim() && (
              <div className="text-center py-8 text-gray-500">
                <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Write some content first, then enhance it with AI</p>
                <Button
                  variant="link"
                  onClick={() => setActiveTab("write")}
                  className="mt-2"
                >
                  Go to Write Tab
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Scheduling */}
        <div className="space-y-3 mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Post
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowScheduler(!showScheduler)}
            >
              {showScheduler ? "Cancel" : "Set Time"}
            </Button>
          </div>

          {showScheduler && (
            <div className="space-y-3 rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
              <Input
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full"
              />
              {scheduleDate && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Scheduled for: {new Date(scheduleDate).toLocaleString()}
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500">
                Your post will be automatically published at the scheduled time
              </p>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {(content || mediaFiles.length > 0) && (
          <div className="space-y-3 mt-6 pt-4 border-t">
            <Label className="text-sm font-semibold">Preview</Label>
            <div className="rounded-lg border bg-gray-50 dark:bg-gray-800 p-4">
              {mediaFiles.length > 0 && (
                <div className="mb-3 flex gap-2 flex-wrap">
                  {mediaFiles.map((media, index) => (
                    <div key={index} className="relative w-16 h-16">
                      <img
                        src={media.preview}
                        alt=""
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm">
                {content || "No content yet..."}
              </p>
              {selectedPlatforms.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedPlatforms.map((platform) => {
                    const platformInfo = platforms.find(
                      (p) => p.id === platform,
                    );
                    return (
                      <Badge
                        key={platform}
                        variant="secondary"
                        className="gap-1"
                      >
                        <span>{platformInfo?.icon}</span>
                        {platformInfo?.name}
                      </Badge>
                    );
                  })}
                </div>
              )}
              {scheduleDate && (
                <div className="mt-3 text-sm text-blue-600 flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  Scheduled for {new Date(scheduleDate).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-6 mt-4 border-t">
          <Button
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            onClick={handlePublish}
            disabled={
              isPublishing || !content.trim() || selectedPlatforms.length === 0
            }
          >
            {isPublishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : scheduleDate ? (
              <Calendar className="mr-2 h-4 w-4" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {scheduleDate ? "Schedule Post" : "Publish Now"}
          </Button>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          {(content || mediaFiles.length > 0) && (
            <Button
              variant="ghost"
              onClick={() => {
                setContent("");
                setMediaFiles([]);
                setEnhancementResult(null);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
