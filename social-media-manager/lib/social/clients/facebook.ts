export class FacebookClient {
  private accessToken: string;
  private pageId: string;
  private useProxy: boolean;

  constructor(accessToken: string, pageId: string) {
    if (!accessToken || !pageId) {
      throw new Error("Facebook access token and page ID are required");
    }
    this.accessToken = accessToken;
    this.pageId = pageId;
    // Use proxy to avoid network restrictions
    this.useProxy = true;
  }

  private getProxyUrl() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return `${baseUrl}/api/facebook/proxy`;
  }

  async post(
    content: string,
    imageUrl?: string,
  ): Promise<{ id: string; url: string; success: boolean }> {
    try {
      console.log("Facebook posting via proxy - Page ID:", this.pageId);

      if (this.useProxy) {
        // Use proxy endpoint
        const response = await fetch(this.getProxyUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `${this.pageId}/feed`,
            method: "POST",
            data: {
              message: content,
              ...(imageUrl ? { link: imageUrl } : {}),
            },
            accessToken: this.accessToken,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(
            result.error ||
              result.data?.error?.message ||
              "Failed to post to Facebook",
          );
        }

        if (result.data?.error) {
          throw new Error(result.data.error.message);
        }

        return {
          id: result.data.id,
          url: `https://facebook.com/${result.data.id}`,
          success: true,
        };
      } else {
        // Direct connection (original code)
        const formData = new URLSearchParams();
        formData.append("message", content);
        formData.append("access_token", this.accessToken);

        const response = await fetch(
          `https://graph.facebook.com/v25.0/${this.pageId}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "Failed to post to Facebook");
        }

        return {
          id: data.id,
          url: `https://facebook.com/${data.id}`,
          success: true,
        };
      }
    } catch (error) {
      console.error("Facebook posting error:", error);
      throw error;
    }
  }

  async getPageInfo() {
    try {
      if (this.useProxy) {
        const response = await fetch(this.getProxyUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: this.pageId,
            method: "GET",
            data: {
              fields: "id,name,username,link",
            },
            accessToken: this.accessToken,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || "Failed to get page info");
        }

        return result.data;
      } else {
        const response = await fetch(
          `https://graph.facebook.com/v25.0/${this.pageId}?fields=id,name,username,link&access_token=${this.accessToken}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "Failed to get page info");
        }

        return data;
      }
    } catch (error) {
      console.error("Facebook get page info error:", error);
      throw error;
    }
  }
}
