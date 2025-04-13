export enum UserRole {
  NORMAL = 'normal',
  CREATOR = 'creator',
  DIRECTOR = 'director'
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt?: Date;
  subscribers?: number;
  subscribedTo?: string[];
  likedCelebrities?: string[]; // For normal users to follow creators
  favoriteDirectors?: string[]; // For creators to follow directors
}