export class FacebookClient {
  private accessToken: string;
  private pageId: string;

  constructor(accessToken: string, pageId: string) {
    if (!accessToken || !pageId) {
      throw new Error("Facebook access token and page ID are required");
    }

    this.accessToken = accessToken;
    this.pageId = pageId;
  }

  async post(
    content: string,
    imageUrl?: string,
  ): Promise<{ id: string; url: string; success: boolean }> {
    try {
      console.log("Facebook posting - Page ID:", this.pageId);

      const formData = new URLSearchParams();

      formData.append("message", content);
      formData.append("access_token", this.accessToken);

      if (imageUrl) {
        formData.append("link", imageUrl);
      }

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

      const responseText = await response.text();

      console.log("Facebook Status:", response.status);
      console.log("Facebook Response:", responseText);

      if (!responseText) {
        throw new Error("Facebook returned an empty response");
      }

      const data = JSON.parse(responseText);

      if (!response.ok) {
        throw new Error(data?.error?.message || "Failed to post to Facebook");
      }

      if (!data?.id) {
        throw new Error(`Facebook did not return a post id: ${responseText}`);
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
      const response = await fetch(
        `https://graph.facebook.com/v25.0/${this.pageId}?fields=id,name,username,link&access_token=${this.accessToken}`,
      );

      const responseText = await response.text();

      console.log("Facebook Page Info Status:", response.status);
      console.log("Facebook Page Info Response:", responseText);

      if (!responseText) {
        throw new Error("Facebook returned an empty response");
      }

      const data = JSON.parse(responseText);

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
