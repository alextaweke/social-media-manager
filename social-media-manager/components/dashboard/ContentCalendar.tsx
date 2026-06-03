/* eslint-disable react-hooks/immutability */
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, MoreVertical } from "lucide-react";

interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduled_for: string;
  status: string;
}

export default function ContentCalendar() {
  const [date, setDate] = useState<Date>(new Date());
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledPosts();
  }, [date]);

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch(
        `/api/posts/scheduled?date=${format(date, "yyyy-MM-dd")}`,
      );
      const data = await response.json();
      setScheduledPosts(data.posts || []);
    } catch (error) {
      console.error("Error fetching scheduled posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const platformColors: Record<string, string> = {
    twitter: "bg-blue-400",
    instagram: "bg-pink-500",
    facebook: "bg-blue-600",
    linkedin: "bg-blue-700",
    telegram: "bg-blue-500",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Content Calendar</span>
          <Button size="sm">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Schedule New
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => newDate && setDate(newDate)}
            className="rounded-md border"
          />
          <div className="space-y-4">
            <h3 className="font-semibold">
              Scheduled for {format(date, "MMMM d, yyyy")}
            </h3>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : scheduledPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No posts scheduled for this day
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {scheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-3 border rounded-lg hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {format(new Date(post.scheduled_for), "h:mm a")}
                          </span>
                          <div className="flex gap-1">
                            {post.platforms.map((platform) => (
                              <Badge
                                key={platform}
                                className={`${platformColors[platform]} text-white text-xs`}
                              >
                                {platform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
