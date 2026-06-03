"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, TrendingUp, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Hashtag {
  id: string;
  tag: string;
  category: string;
  usage_count: number;
}

export default function HashtagManager() {
  const [hashtags, setHashtags] = useState<Hashtag[]>([
    { id: "1", tag: "socialmedia", category: "General", usage_count: 45 },
    { id: "2", tag: "marketing", category: "General", usage_count: 38 },
    { id: "3", tag: "instagramtips", category: "Instagram", usage_count: 29 },
    { id: "4", tag: "growthhacking", category: "Growth", usage_count: 22 },
  ]);
  const [newTag, setNewTag] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [copied, setCopied] = useState(false);

  const trendingHashtags = [
    { tag: "digitalmarketing", trend: "+45%" },
    { tag: "aitools", trend: "+67%" },
    { tag: "contentcreation", trend: "+23%" },
  ];

  const addHashtag = () => {
    if (!newTag.trim()) return;
    const newHashtag: Hashtag = {
      id: Date.now().toString(),
      tag: newTag.toLowerCase().replace("#", ""),
      category: selectedCategory,
      usage_count: 0,
    };
    setHashtags([...hashtags, newHashtag]);
    setNewTag("");
    toast.success("Hashtag added");
  };

  const removeHashtag = (id: string) => {
    setHashtags(hashtags.filter((h) => h.id !== id));
    toast.success("Hashtag removed");
  };

  const copyHashtags = (tags: string[]) => {
    const hashtagString = tags.map((t) => `#${t}`).join(" ");
    navigator.clipboard.writeText(hashtagString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Hashtags copied to clipboard");
  };

  const categories = [
    "General",
    "Instagram",
    "Twitter",
    "Facebook",
    "LinkedIn",
    "Growth",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hashtag Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="myHashtags">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="myHashtags">My Hashtags</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
          </TabsList>

          <TabsContent value="myHashtags" className="space-y-4">
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border rounded-md px-3 py-2"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Enter hashtag (without #)"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addHashtag()}
              />
              <Button onClick={addHashtag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyHashtags(hashtags.map((h) => h.tag))}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {hashtags.map((hashtag) => (
                <Badge
                  key={hashtag.id}
                  variant="secondary"
                  className="px-3 py-1"
                >
                  #{hashtag.tag}
                  <button
                    onClick={() => removeHashtag(hashtag.id)}
                    className="ml-2 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trending">
            <div className="space-y-2">
              {trendingHashtags.map((hashtag) => (
                <div
                  key={hashtag.tag}
                  className="flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                >
                  <div>
                    <span className="font-mono">#{hashtag.tag}</span>
                    <Badge variant="outline" className="ml-2 text-green-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {hashtag.trend}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyHashtags([hashtag.tag])}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="suggestions">
            <div className="text-center py-8 text-gray-500">
              Enter your niche to get AI-powered hashtag suggestions
              <div className="mt-4 flex gap-2 max-w-md mx-auto">
                <Input placeholder="e.g., social media, marketing, fashion" />
                <Button>Get Suggestions</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
