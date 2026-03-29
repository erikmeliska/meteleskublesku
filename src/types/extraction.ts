export interface VideoMetadata {
  video_id: string;
  duration: number;
  title: string;
  description: string;
  samples: Sample[];
}

export interface Sample {
  begin: number;
  end: number;
  duration: number;
  name: string;
  audio: string;
  images: {
    begin: string;
    middle: string;
    end: string;
  };
  subtitles: string;
}

export interface VideoInfo {
  videoId: string;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  subtitleLanguages: string[];
  autoSubtitleLanguages: string[];
}
