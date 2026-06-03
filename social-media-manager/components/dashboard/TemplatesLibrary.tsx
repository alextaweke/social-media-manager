/* eslint-disable react-hooks/immutability */
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Copy, Star, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  content: string;
  platforms: string[];
  hashtags: string[];
  is_favorite: boolean;
  usage_count: number;
}

export default function TemplatesLibrary() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/templates");
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = async (template: Template) => {
    // Copy content to clipboard
    navigator.clipboard.writeText(template.content);
    toast.success("Template copied to clipboard!");

    // Update usage count
    await fetch("/api/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: template.id, incrementUsage: true }),
    });
  };

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    await fetch("/api/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_favorite: !isFavorite }),
    });
    fetchTemplates();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Post Templates</span>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Template
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No templates yet. Save your first post as a template.
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-3 border rounded-lg hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <button
                        onClick={() =>
                          toggleFavorite(template.id, template.is_favorite)
                        }
                      >
                        <Star
                          className={`h-4 w-4 ${template.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"}`}
                        />
                      </button>
                    </div>
                    <p className="text-sm line-clamp-2">{template.content}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.platforms.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      // eslint-disable-next-line react-hooks/rules-of-hooks
                      onClick={() => useTemplate(template)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
