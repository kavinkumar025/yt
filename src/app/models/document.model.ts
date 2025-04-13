export interface DocumentStats {
  views: number;
  downloads: number;
  likes: number;
}

export interface Document {
  id: string;
  title: string;
  description: string;
  category: string;
  fileURL: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: Date;
  userId: string;
  userName: string;
  userPhotoURL: string;
  stats: DocumentStats;
}

export interface DocumentUpload {
  title: string;
  description: string;
  category: string;
}