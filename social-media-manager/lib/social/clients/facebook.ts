export class FacebookClient {
  private accessToken: string;
  private pageId: string;
  private apiUrl = "https://graph.facebook.com/v25.0";

  constructor(accessToken: string, pageId: string) {
    if (!accessToken || !pageId) {
      throw new Error("Facebook access token and page ID are required");
    }
    this.accessToken = accessToken;
    this.pageId = pageId;
  }

  async post(content: string, imageUrl?: string) {
    try {
      console.log("Facebook post attempt:", {
        pageId: this.pageId,
        contentLength: content.length,
        hasImage: !!imageUrl,
        tokenPrefix: this.accessToken.substring(0, 20) + "...",
      });

      let response;
      let data;

      // If there's an image, post as photo
      if (imageUrl) {
        console.log("Posting photo to Facebook");

        const formData = new URLSearchParams();
        formData.append("url", imageUrl);
        formData.append("caption", content);
        formData.append("access_token", this.accessToken);
        formData.append("published", "true");

        response = await fetch(`${this.apiUrl}/${this.pageId}/photos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        data = await response.json();

        if (!response.ok) {
          console.error("Facebook photo post error:", data);
          throw new Error(
            data.error?.message || "Failed to post photo to Facebook",
          );
        }

        return {
          id: data.id,
          url: `https://facebook.com/${data.id}`,
          success: true,
        };
      }

      // Regular text post
      console.log("Posting text to Facebook");
      const formData = new URLSearchParams();
      formData.append("message", content);
      formData.append("access_token", this.accessToken);

      response = await fetch(`${this.apiUrl}/${this.pageId}/feed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      data = await response.json();

      if (!response.ok) {
        console.error("Facebook text post error:", data);

        // Provide specific error messages
        if (data.error?.code === 190) {
          throw new Error(
            "Access token expired. Please reconnect your Facebook page",
          );
        } else if (data.error?.code === 200) {
          throw new Error(
            "Permission error. Make sure your token has 'pages_manage_posts' permission",
          );
        } else if (data.error?.code === 368) {
          throw new Error(
            "Temporarily blocked due to rate limiting. Try again later",
          );
        } else {
          throw new Error(data.error?.message || "Failed to post to Facebook");
        }
      }

      console.log("Facebook post successful:", data.id);
      return {
        id: data.id,
        url: `https://facebook.com/${data.id}`,
        success: true,
      };
    } catch (error) {
      console.error("Facebook posting error:", error);
      throw error;
    }
  }

  async getPageInfo() {
    try {
      const response = await fetch(
        `${this.apiUrl}/${this.pageId}?fields=id,name,username,link&access_token=${this.accessToken}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to get page info");
      }

      return {
        id: data.id,
        name: data.name,
        username: data.username,
        url: data.link,
      };
    } catch (error) {
      console.error("Facebook get page info error:", error);
      throw error;
    }
  }
}
