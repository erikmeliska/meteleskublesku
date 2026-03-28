export interface YouTubeSearchResult {
  type: string;
  title: string;
  url: string;
  bestThumbnail: {
    url: string | null;
    width: number;
    height: number;
  };
  duration: string | null;
  views: number | null;
  author: {
    name: string;
    url: string;
  } | null;
  uploadedAt: string | null;
}

export interface YouTubeSearchResponse {
  items: YouTubeSearchResult[];
  estimatedResults: number;
}
