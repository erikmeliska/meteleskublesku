export interface Movie {
  id: string;
  title: string;
  image: string | null;
  desc: string[];
  audio: LegacyAudioTrack[];
  images: MovieImage[];
}

export interface MovieListItem {
  id: string;
  title: string;
  image: string | null;
  desc: string[];
  audioTracks?: { id: string; text: string }[]; // clips for search
  isMine?: boolean; // user's own extracted film
}

export interface AudioTrack {
  id: string; // clip_xxx (full DB id)
  text: string;
  url: string;
  length: string;
  shareHash?: string | null;
  images?: string[]; // clip screenshot paths
}

/** Legacy audio track from scraper (no clip ID) */
export interface LegacyAudioTrack {
  text: string;
  url: string;
  length: string;
}

export interface MovieImage {
  thumbnail: string;
  url: string;
}
