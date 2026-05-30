export class LinkedInClient {
  private accessToken: string;
  private apiUrl = "https://api.linkedin.com/v2";

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async post(content: string, mediaUrl?: string) {
    try {
      // Get user profile
      const profile = await this.getUserProfile();

      const postData = {
        author: `urn:li:person:${profile.id}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: mediaUrl ? "IMAGE" : "NONE",
            ...(mediaUrl && {
              media: [
                {
                  status: "READY",
                  description: {
                    text: content,
                  },
                  originalUrl: mediaUrl,
                },
              ],
            }),
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      };

      const response = await fetch(`${this.apiUrl}/ugcPosts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postData),
      });

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.message || "Failed to post to LinkedIn");

      return {
        id: data.id,
        url: `https://linkedin.com/feed/update/${data.id}`,
      };
    } catch (error) {
      console.error("LinkedIn posting error:", error);
      throw error;
    }
  }

  async getUserProfile() {
    const response = await fetch(`${this.apiUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    const data = await response.json();
    return data;
  }
}
