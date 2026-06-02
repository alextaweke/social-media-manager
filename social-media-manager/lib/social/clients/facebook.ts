export class FacebookClient {
  private accessToken: string;
  private pageId: string;
  private apiUrl = "https://graph.facebook.com/v18.0";

  constructor(accessToken: string, pageId: string) {
    if (!accessToken || !pageId) {
      throw new Error("Facebook access token and page ID are required");
    }
    this.accessToken = accessToken;
    this.pageId = pageId;
  }

  async post(content: string, imageUrl?: string, link?: string) {
    try {
      console.log("Facebook post attempt:", {
        contentLength: content.length,
        hasImage: !!imageUrl,
      });

      // First, verify the token is valid
      const isValid = await this.verifyToken();
      if (!isValid) {
        throw new Error("Facebook access token is invalid or expired");
      }

      let response;
      let data;

      // If there's an image, post as photo
      if (imageUrl) {
        console.log("Posting photo to Facebook");

        // For photos, we need to use a different endpoint
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

        // Check for specific errors
        if (data.error?.code === 200) {
          throw new Error(
            "Permission error: Your access token doesn't have permission to post",
          );
        } else if (data.error?.code === 190) {
          throw new Error(
            "Access token expired. Please reconnect your Facebook page",
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

  async verifyToken(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiUrl}/debug_token?input_token=${this.accessToken}&access_token=${this.accessToken}`,
      );
      const data = await response.json();

      if (!response.ok || !data.data?.is_valid) {
        console.error("Token verification failed:", data);
        return false;
      }

      console.log("Token verified successfully");
      return true;
    } catch (error) {
      console.error("Token verification error:", error);
      return false;
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
