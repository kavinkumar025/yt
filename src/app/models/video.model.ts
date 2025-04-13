export interface VideoStats {
  views: number;
  likes: number;
  dislikes: number;
  comments: number;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  category: string;
  videoURL: string;
  thumbnailURL: string;
  createdAt: Date;
  userId: string;
  userName: string;
  userPhotoURL: string;
  duration: string;
  stats: VideoStats;
}

export interface VideoUpload {
  title: string;
  description: string;
  category: string;
  thumbnailURL?: string;
  duration?: string;
}