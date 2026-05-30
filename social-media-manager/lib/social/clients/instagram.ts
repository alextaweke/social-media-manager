export class InstagramClient {
  private accessToken: string;
  private userId: string;
  private apiUrl = "https://graph.facebook.com/v18.0";

  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken;
    this.userId = userId;
  }

  async post(content: string, imageUrl?: string) {
    try {
      // First, create media container
      let creationResponse;

      if (imageUrl) {
        creationResponse = await fetch(
          `${this.apiUrl}/${this.userId}/media?image_url=${encodeURIComponent(imageUrl)}&caption=${encodeURIComponent(content)}&access_token=${this.accessToken}`,
          { method: "POST" },
        );
      } else {
        creationResponse = await fetch(
          `${this.apiUrl}/${this.userId}/media?caption=${encodeURIComponent(content)}&access_token=${this.accessToken}`,
          { method: "POST" },
        );
      }

      const creationData = await creationResponse.json();

      if (!creationResponse.ok) throw new Error(creationData.error?.message);

      // Then, publish the media
      const publishResponse = await fetch(
        `${this.apiUrl}/${this.userId}/media_publish?creation_id=${creationData.id}&access_token=${this.accessToken}`,
        { method: "POST" },
      );

      const publishData = await publishResponse.json();

      if (!publishResponse.ok) throw new Error(publishData.error?.message);

      return {
        id: publishData.id,
        url: `https://instagram.com/p/${publishData.id}`,
      };
    } catch (error) {
      console.error("Instagram posting error:", error);
      throw error;
    }
  }

  async getBusinessDiscovery() {
    const response = await fetch(
      `${this.apiUrl}/${this.userId}?fields=id,username,name,media_count,followers_count&access_token=${this.accessToken}`,
    );

    const data = await response.json();
    return data;
  }
}
