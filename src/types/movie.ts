export interface Movie {
  id: string;
  title: string;
  image: string | null;
  desc: string[];
  audio: AudioTrack[];
  images: MovieImage[];
}

export interface MovieListItem {
  id: string;
  title: string;
  image: string | null;
  desc: string[];
  audioTracks?: string[]; // audio track names for search
}

export interface AudioTrack {
  text: string;
  url: string;
  length: string;
}

export interface MovieImage {
  thumbnail: string;
  url: string;
}
