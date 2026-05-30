import { createClient } from "@/lib/supabase/server";

interface TwitterConfig {
  accessToken: string;
  refreshToken?: string;
}

export class TwitterClient {
  private accessToken: string;
  private apiUrl = "https://api.twitter.com/2";

  constructor(config: TwitterConfig) {
    this.accessToken = config.accessToken;
  }

  async post(content: string, mediaUrls?: string[]) {
    try {
      let mediaIds: string[] = [];

      // Upload media if any
      if (mediaUrls && mediaUrls.length > 0) {
        mediaIds = await this.uploadMedia(mediaUrls);
      }

      const response = await fetch(`${this.apiUrl}/tweets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: content,
          ...(mediaIds.length > 0 && { media: { media_ids: mediaIds } }),
        }),
      });

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.detail || "Failed to post to Twitter");

      return {
        id: data.data.id,
        url: `https://twitter.com/i/web/status/${data.data.id}`,
      };
    } catch (error) {
      console.error("Twitter posting error:", error);
      throw error;
    }
  }

  private async uploadMedia(mediaUrls: string[]): Promise<string[]> {
    // Implementation for media upload
    // Twitter requires multipart form data upload
    return [];
  }

  async getUserInfo(accessToken: string) {
    const response = await fetch(`${this.apiUrl}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    return data.data;
  }
}
