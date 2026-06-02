/* eslint-disable @typescript-eslint/no-explicit-any */
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
      const postData: any = {
        message: content,
        access_token: this.accessToken,
      };

      // If there's an image, post as photo
      if (imageUrl) {
        const photoResponse = await fetch(
          `${this.apiUrl}/${this.pageId}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: imageUrl,
              caption: content,
              access_token: this.accessToken,
              published: true,
            }),
          },
        );

        const photoData = await photoResponse.json();

        if (!photoResponse.ok) {
          throw new Error(
            photoData.error?.message || "Failed to post photo to Facebook",
          );
        }

        return {
          id: photoData.id,
          url: `https://facebook.com/${photoData.id}`,
          success: true,
        };
      }

      // If there's a link, post as link
      if (link) {
        postData.link = link;
      }

      // Regular text post
      const response = await fetch(`${this.apiUrl}/${this.pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to post to Facebook");
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

  async postWithMultipleImages(content: string, imageUrls: string[]) {
    try {
      // First, upload each image to get their IDs
      const uploadedIds = [];
      for (const imageUrl of imageUrls) {
        const uploadResponse = await fetch(
          `${this.apiUrl}/${this.pageId}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: imageUrl,
              published: false,
              access_token: this.accessToken,
            }),
          },
        );

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(
            uploadData.error?.message || "Failed to upload image",
          );
        }
        uploadedIds.push({ media_fbid: uploadData.id });
      }

      // Create album post with all images
      const response = await fetch(`${this.apiUrl}/${this.pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          attached_media: uploadedIds.map((id) => JSON.stringify(id)),
          access_token: this.accessToken,
          published: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to create album post");
      }

      return {
        id: data.id,
        url: `https://facebook.com/${data.id}`,
        success: true,
      };
    } catch (error) {
      console.error("Facebook multi-image posting error:", error);
      throw error;
    }
  }

  async getPageInfo() {
    try {
      // Updated fields - removed fan_count which is deprecated
      const response = await fetch(
        `${this.apiUrl}/${this.pageId}?fields=id,name,username,link,about,website,phone,emails&access_token=${this.accessToken}`,
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
        about: data.about,
        website: data.website,
      };
    } catch (error) {
      console.error("Facebook get page info error:", error);
      throw error;
    }
  }

  async getPageFollowers() {
    try {
      // Alternative way to get follower count using page_fans metric
      const response = await fetch(
        `${this.apiUrl}/${this.pageId}/insights?metric=page_fans&access_token=${this.accessToken}`,
      );

      const data = await response.json();

      if (!response.ok) {
        // Return null instead of throwing error
        return null;
      }

      if (data.data && data.data[0] && data.data[0].values) {
        const latestValue = data.data[0].values[data.data[0].values.length - 1];
        return {
          followers: latestValue.value,
        };
      }

      return null;
    } catch (error) {
      console.error("Facebook get followers error:", error);
      return null;
    }
  }

  async getPostInsights(postId: string) {
    try {
      const response = await fetch(
        `${this.apiUrl}/${postId}/insights?metric=post_impressions,post_engaged_users,post_reactions_like_total&access_token=${this.accessToken}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to get post insights");
      }

      return data.data;
    } catch (error) {
      console.error("Facebook get insights error:", error);
      return null;
    }
  }
}
