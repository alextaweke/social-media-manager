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
    this.useProxy = true;
  }

  private getProxyUrl() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not configured");
    }

    return `${baseUrl}/api/facebook/proxy`;
  }

  private async parseResponse(response: Response) {
    const text = await response.text();

    console.log("Facebook proxy status:", response.status);
    console.log("Facebook proxy response:", text);

    if (!text || !text.trim()) {
      throw new Error("Empty response returned from Facebook proxy");
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON returned from proxy: ${text}`);
    }
  }

  async post(
    content: string,
    imageUrl?: string,
  ): Promise<{ id: string; url: string; success: boolean }> {
    try {
      console.log("Facebook posting - Page ID:", this.pageId);
      console.log("Proxy URL:", this.getProxyUrl());

      if (this.useProxy) {
        const response = await fetch(this.getProxyUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

        const result = await this.parseResponse(response);

        if (!response.ok) {
          throw new Error(
            result?.error ||
              result?.data?.error?.message ||
              "Facebook proxy request failed",
          );
        }

        if (!result.success) {
          throw new Error(
            result.error ||
              result?.data?.error?.message ||
              "Facebook post failed",
          );
        }

        if (result.data?.error) {
          throw new Error(result.data.error.message);
        }

        if (!result.data?.id) {
          throw new Error(
            `Facebook did not return a post id: ${JSON.stringify(result)}`,
          );
        }

        return {
          id: result.data.id,
          url: `https://facebook.com/${result.data.id}`,
          success: true,
        };
      }

      const formData = new URLSearchParams();
      formData.append("message", content);
      formData.append("access_token", this.accessToken);

      const response = await fetch(
        `https://graph.facebook.com/v25.0/${this.pageId}/feed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || "Failed to post to Facebook");
      }

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
      if (this.useProxy) {
        const response = await fetch(this.getProxyUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            endpoint: this.pageId,
            method: "GET",
            data: {
              fields: "id,name,username,link",
            },
            accessToken: this.accessToken,
          }),
        });

        const result = await this.parseResponse(response);

        if (!response.ok) {
          throw new Error(
            result?.error ||
              result?.data?.error?.message ||
              "Failed to get page info",
          );
        }

        if (!result.success) {
          throw new Error(result.error || "Failed to get page info");
        }

        return result.data;
      }

      const response = await fetch(
        `https://graph.facebook.com/v25.0/${this.pageId}?fields=id,name,username,link&access_token=${this.accessToken}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || "Failed to get page info");
      }

      return data;
    } catch (error) {
      console.error("Facebook get page info error:", error);
      throw error;
    }
  }
}
