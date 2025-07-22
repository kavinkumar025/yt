import { Injectable } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap, forkJoin } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
  startAfter
} from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from '@angular/fire/storage';
import { Video, VideoStats, VideoUpload } from '../models/video.model';
import { AuthService } from './auth.service';
import { limit as firestoreLimit } from 'firebase/firestore';
import { setDoc } from '@angular/fire/firestore';


@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private lastDoc: DocumentSnapshot | null = null;

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private authService: AuthService
  ) { }

  uploadVideo(videoData: VideoUpload, file: File): Observable<string> {
    const currentUser = this.authService.getCurrentUser();
    console.log("Current user UID:", currentUser?.uid);

    if (!currentUser) {
      return of('');
    }

    const videoId = doc(collection(this.firestore, 'dummy')).id;
    const filePath = `videos/${currentUser.uid}/${videoId}`;
    const storageRef = ref(this.storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Observable<string>(observer => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          console.error('Upload error:', error);
          observer.error(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(downloadURL => {
            const videoRef = doc(this.firestore, `videos/${videoId}`);
            const videoStats: VideoStats = {
              views: 0,
              likes: 0,
              dislikes: 0,
              comments: 0
            };

            const videoDoc = {
              id: videoId,
              title: videoData.title,
              description: videoData.description,
              category: videoData.category,
              videoURL: downloadURL,
              thumbnailURL: videoData.thumbnailURL || '',
              createdAt: serverTimestamp(),
              userId: currentUser.uid,
              userName: currentUser.displayName || 'Unknown User',
              userPhotoURL: currentUser.photoURL || '',
              duration: videoData.duration || '0:00',
              stats: videoStats
            };

            setDoc(videoRef, videoDoc)
              .then(() => {
                observer.next(videoId);
                observer.complete();
              })
              .catch(error => {
                console.error('Error adding document:', error);
                observer.error(error);
              });
          });

        }
      );
    });
  }

  uploadThumbnail(file: File): Observable<string> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of('');
    }

    const thumbnailId = `${Date.now()}_${file.name}`;
    const filePath = `thumbnails/${currentUser.uid}/${thumbnailId}`;
    const storageRef = ref(this.storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Observable<string>(observer => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Thumbnail upload is ' + progress + '% done');
        },
        (error) => {
          console.error('Thumbnail upload error:', error);
          observer.error(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then(downloadURL => {
            observer.next(downloadURL);
            observer.complete();
          });
        }
      );
    });
  }

  getTrendingVideos(limit: number = 8): Observable<Video[]> {
    const videosRef = collection(this.firestore, 'videos');
    const q = query(
      videosRef,
      orderBy('stats.views', 'desc'),
      firestoreLimit(limit)
    );

    return from(getDocs(q)).pipe(
      map(snapshot => this.convertTimestamps(snapshot.docs.map(doc => doc.data() as Video))),
      catchError(error => {
        console.error('Error fetching trending videos:', error);
        return of([]);
      })
    );
  }

  getRecommendedVideos(videoId: string = '', limit: number = 8): Observable<Video[]> {
    const videosRef = collection(this.firestore, 'videos');
    let q;

    if (videoId) {
      // Get the current video to find related content
      return from(getDoc(doc(this.firestore, `videos/${videoId}`))).pipe(
        switchMap(videoDoc => {
          if (videoDoc.exists()) {
            const videoData = videoDoc.data() as Video;
            q = query(
              videosRef,
              where('category', '==', videoData.category),
              where('id', '!=', videoId),
              firestoreLimit(limit)
            );
          } else {
            q = query(
              videosRef,
              orderBy('createdAt', 'desc'),
              firestoreLimit(limit)
            );
          }

          return from(getDocs(q)).pipe(
            map(snapshot => this.convertTimestamps(snapshot.docs.map(doc => doc.data() as Video)))
          );
        }),
        catchError(error => {
          console.error('Error fetching recommended videos:', error);
          return of([]);
        })
      );
    } else {
      // If no video ID provided, just get recent videos
      q = query(
        videosRef,
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      );

      return from(getDocs(q)).pipe(
        map(snapshot => this.convertTimestamps(snapshot.docs.map(doc => doc.data() as Video))),
        catchError(error => {
          console.error('Error fetching recommended videos:', error);
          return of([]);
        })
      );
    }
  }

  getRecentVideos(limit: number = 8): Observable<Video[]> {
    const videosRef = collection(this.firestore, 'videos');
    const q = query(
      videosRef,
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    return from(getDocs(q)).pipe(
      map(snapshot => {
        this.lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
        return this.convertTimestamps(snapshot.docs.map(doc => doc.data() as Video));
      }),
      catchError(error => {
        console.error('Error fetching recent videos:', error);
        return of([]);
      })
    );
  }

  getMoreVideos(category: string = '', limit: number = 8): Observable<Video[]> {
    if (!this.lastDoc) {
      return this.getRecentVideos(limit);
    }

    const videosRef = collection(this.firestore, 'videos');
    let q;

    if (category) {
      q = query(
        videosRef,
        where('category', '==', category),
        orderBy('createdAt', 'desc'),
        startAfter(this.lastDoc),
        firestoreLimit(limit)
      );
    } else {
      q = query(
        videosRef,
        orderBy('createdAt', 'desc'),
        startAfter(this.lastDoc),
        firestoreLimit(limit)
      );
    }

    return from(getDocs(q)).pipe(
      map(snapshot => {
        if (snapshot.docs.length > 0) {
          this.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        }
        return this.convertTimestamps(snapshot.docs.map(doc => doc.data() as Video));
      }),
      catchError(error => {
        console.error('Error fetching more videos:', error);
        return of([]);
      })
    );
  }

  getVideosByCategory(category: string, limit: number = 8): Observable<Video[]> {
    const videosRef = collection(this.firestore, 'videos');
    const q = query(
      videosRef,
      where('category', '==', category),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    return from(getDocs(q)).pipe(
      map(snapshot => this.convertTimestamps(snapshot.docs.map(doc => doc.data() as Video))),
      catchError(error => {
        console.error(`Error fetching videos for category ${category}:`, error);
        return of([]);
      })
    );
  }

  getVideoById(id: string): Observable<Video> {
    const videoRef = doc(this.firestore, `videos/${id}`);

    return from(getDoc(videoRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const video = docSnap.data() as Video;
          return this.convertTimestamp(video);
        }
        throw new Error('Video not found');
      }),
      catchError(error => {
        console.error('Error fetching video:', error);
        throw error;
      })
    );
  }

  getUserVideos(userId: string, limit: number = 8): Observable<Video[]> {
    const videosRef = collection(this.firestore, 'videos');
    const q = query(
      videosRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    return from(getDocs(q)).pipe(
      map(snapshot => this.convertTimestamps(snapshot.docs.map(doc => doc.data() as Video))),
      catchError(error => {
        console.error(`Error fetching videos for user ${userId}:`, error);
        return of([]);
      })
    );
  }

  getVideosByCreator(creatorIds: string[], limit: number = 8): Observable<Video[]> {
    if (!creatorIds || creatorIds.length === 0) {
      return of([]);
    }

    // Firestore "in" operator is limited to 10 values, so we might need multiple queries
    const chunks: string[][] = [];
    for (let i = 0; i < creatorIds.length; i += 10) {
      chunks.push(creatorIds.slice(i, i + 10));
    }

    // Create an observable for each chunk of creator IDs
    const queries = chunks.map(chunk => {
      const videosRef = collection(this.firestore, 'videos');
      const q = query(
        videosRef,
        where('userId', 'in', chunk),
        orderBy('createdAt', 'desc'),
        firestoreLimit(limit)
      );

      return from(getDocs(q)).pipe(
        map(snapshot => this.convertTimestamps(snapshot.docs.map(doc => doc.data() as Video)))
      );
    });

    // Combine all the query results
    if (queries.length === 0) {
      return of([]);
    }

    // Use forkJoin instead of Promise.all with toPromise
    return forkJoin(queries).pipe(
      map(results => {
        // Flatten the array of arrays and limit to the requested number
        const flattened = results.reduce((acc, val) => acc.concat(val), [] as Video[]);
        // Sort by creation date
        return flattened
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, limit);
      }),
      catchError(error => {
        console.error('Error fetching videos for creators:', error);
        return of([]);
      })
    );
  }

  incrementViewCount(videoId: string): Observable<void> {
    const videoRef = doc(this.firestore, `videos/${videoId}`);

    return from(getDoc(videoRef)).pipe(
      switchMap(docSnap => {
        if (docSnap.exists()) {
          const videoData = docSnap.data();
          const currentViews = videoData?.['stats']?.views || 0;

          return from(updateDoc(videoRef, {
            'stats.views': currentViews + 1
          }));
        }
        throw new Error('Video not found');
      }),
      catchError(error => {
        console.error('Error incrementing view count:', error);
        throw error;
      })
    );
  }

  likeVideo(videoId: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(void 0);
    }

    const videoRef = doc(this.firestore, `videos/${videoId}`);
    const likeRef = doc(this.firestore, `videoLikes/${currentUser.uid}_${videoId}`);

    // First check if the user already liked or disliked this video
    return from(getDoc(likeRef)).pipe(
      switchMap(docSnap => {
        const batch = [];

        if (docSnap.exists()) {
          const data = docSnap.data();

          if (data['type'] === 'like') {
            // User already liked, so remove the like
            batch.push(deleteDoc(likeRef));

            return from(getDoc(videoRef)).pipe(
              switchMap(videoSnap => {
                if (videoSnap.exists()) {
                  const videoData = videoSnap.data();
                  const currentLikes = videoData['stats'].likes || 0;

                  batch.push(updateDoc(videoRef, {
                    'stats.likes': Math.max(0, currentLikes - 1)
                  }));
                }

                return from(Promise.all(batch));
              })
            );
          } else if (data['type'] === 'dislike') {
            // User disliked before, now wants to like
            batch.push(updateDoc(likeRef, { type: 'like' }));

            return from(getDoc(videoRef)).pipe(
              switchMap(videoSnap => {
                if (videoSnap.exists()) {
                  const videoData = videoSnap.data();
                  const currentLikes = videoData['stats'].likes || 0;
                  const currentDislikes = videoData['stats'].dislikes || 0;

                  batch.push(updateDoc(videoRef, {
                    'stats.likes': currentLikes + 1,
                    'stats.dislikes': Math.max(0, currentDislikes - 1)
                  }));
                }

                return from(Promise.all(batch));
              })
            );
          }
        } else {
          // New like
          batch.push(setDoc(likeRef, {
            userId: currentUser.uid,
            videoId: videoId,
            type: 'like',
            createdAt: serverTimestamp()
          }));

          return from(getDoc(videoRef)).pipe(
            switchMap(videoSnap => {
              if (videoSnap.exists()) {
                const videoData = videoSnap.data();
                const currentLikes = videoData['stats'].likes || 0;

                batch.push(updateDoc(videoRef, {
                  'stats.likes': currentLikes + 1
                }));
              }

              return from(Promise.all(batch));
            })
          );
        }

        return of(void 0);
      }),
      map(() => void 0),
      catchError(error => {
        console.error('Error liking video:', error);
        throw error;
      })
    );
  }

  dislikeVideo(videoId: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(void 0);
    }

    const videoRef = doc(this.firestore, `videos/${videoId}`);
    const likeRef = doc(this.firestore, `videoLikes/${currentUser.uid}_${videoId}`);

    // First check if the user already liked or disliked this video
    return from(getDoc(likeRef)).pipe(
      switchMap(docSnap => {
        const batch = [];

        if (docSnap.exists()) {
          const data = docSnap.data();

          if (data['type'] === 'dislike') {
            // User already disliked, so remove the dislike
            batch.push(deleteDoc(likeRef));

            return from(getDoc(videoRef)).pipe(
              switchMap(videoSnap => {
                if (videoSnap.exists()) {
                  const videoData = videoSnap.data();
                  const currentDislikes = videoData['stats'].dislikes || 0;

                  batch.push(updateDoc(videoRef, {
                    'stats.dislikes': Math.max(0, currentDislikes - 1)
                  }));
                }

                return from(Promise.all(batch));
              })
            );
          } else if (data['type'] === 'like') {
            // User liked before, now wants to dislike
            batch.push(updateDoc(likeRef, { type: 'dislike' }));

            return from(getDoc(videoRef)).pipe(
              switchMap(videoSnap => {
                if (videoSnap.exists()) {
                  const videoData = videoSnap.data();
                  const currentLikes = videoData['stats'].likes || 0;
                  const currentDislikes = videoData['stats'].dislikes || 0;

                  batch.push(updateDoc(videoRef, {
                    'stats.likes': Math.max(0, currentLikes - 1),
                    'stats.dislikes': currentDislikes + 1
                  }));
                }

                return from(Promise.all(batch));
              })
            );
          }
        } else {
          // New dislike
          batch.push(setDoc(likeRef, {
            userId: currentUser.uid,
            videoId: videoId,
            type: 'dislike',
            createdAt: serverTimestamp()
          }));

          return from(getDoc(videoRef)).pipe(
            switchMap(videoSnap => {
              if (videoSnap.exists()) {
                const videoData = videoSnap.data();
                const currentDislikes = videoData['stats'].dislikes || 0;

                batch.push(updateDoc(videoRef, {
                  'stats.dislikes': currentDislikes + 1
                }));
              }

              return from(Promise.all(batch));
            })
          );
        }

        return of(void 0);
      }),
      map(() => void 0),
      catchError(error => {
        console.error('Error disliking video:', error);
        throw error;
      })
    );
  }

  getUserLikeStatus(videoId: string): Observable<'like' | 'dislike' | null> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(null);
    }

    const likeRef = doc(this.firestore, `videoLikes/${currentUser.uid}_${videoId}`);

    return from(getDoc(likeRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          return data['type'] as 'like' | 'dislike';
        }
        return null;
      }),
      catchError(error => {
        console.error('Error getting like status:', error);
        return of(null);
      })
    );
  }

  addComment(videoId: string, text: string): Observable<string> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of('');
    }

    const commentsRef = collection(this.firestore, 'comments');
    const videoRef = doc(this.firestore, `videos/${videoId}`);

    const comment = {
      videoId,
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Unknown User',
      userPhotoURL: currentUser.photoURL || '',
      text,
      createdAt: serverTimestamp(),
      likes: 0,
      dislikes: 0
    };

    return from(addDoc(commentsRef, comment)).pipe(
      switchMap(docRef => {
        // Update the comment id
        const commentId = docRef.id;
        return from(updateDoc(docRef, { id: commentId })).pipe(
          // Increment comment count on video
          switchMap(() => from(getDoc(videoRef))),
          switchMap(videoSnap => {
            if (videoSnap.exists()) {
              const videoData = videoSnap.data();
              const currentComments = videoData['stats'].comments || 0;

              return from(updateDoc(videoRef, {
                'stats.comments': currentComments + 1
              }));
            }
            return of(void 0);
          }),
          map(() => commentId)
        );
      }),
      catchError(error => {
        console.error('Error adding comment:', error);
        return of('');
      })
    );
  }

  getComments(videoId: string): Observable<any[]> {
    const commentsRef = collection(this.firestore, 'comments');
    const q = query(
      commentsRef,
      where('videoId', '==', videoId),
      orderBy('createdAt', 'desc')
    );

    return from(getDocs(q)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data();
          // Convert Firestore timestamp to JS Date
          if (data['createdAt'] && typeof data['createdAt'].toDate === 'function') {
            data['createdAt'] = data['createdAt'].toDate();
          }
          return data;


        });
      }),
      catchError(error => {
        console.error('Error fetching comments:', error);
        return of([]);
      })
    );
  }

  deleteVideo(videoId: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(void 0);
    }

    const videoRef = doc(this.firestore, `videos/${videoId}`);

    return from(getDoc(videoRef)).pipe(
      switchMap(docSnap => {
        if (docSnap.exists()) {
          const videoData = docSnap.data() as Video;

          // Check if current user is the owner
          if (videoData.userId !== currentUser.uid) {
            throw new Error('You do not have permission to delete this video');
          }

          const batch = [];

          // Delete video file from storage
          if (videoData.videoURL) {
            const videoPath = videoData.videoURL.split('/').pop();
            if (videoPath) {
              const storageRef = ref(this.storage, `videos/${currentUser.uid}/${videoPath}`);
              batch.push(deleteObject(storageRef).catch(err => console.error('Error deleting video file:', err)));
            }
          }

          // Delete thumbnail from storage
          if (videoData.thumbnailURL) {
            const thumbnailPath = videoData.thumbnailURL.split('/').pop();
            if (thumbnailPath) {
              const storageRef = ref(this.storage, `thumbnails/${currentUser.uid}/${thumbnailPath}`);
              batch.push(deleteObject(storageRef).catch(err => console.error('Error deleting thumbnail:', err)));
            }
          }

          // Delete comments
          const commentsRef = collection(this.firestore, 'comments');
          const q = query(commentsRef, where('videoId', '==', videoId));

          batch.push(
            getDocs(q).then(snapshot => {
              const deleteOperations = snapshot.docs.map(doc => deleteDoc(doc.ref));
              return Promise.all(deleteOperations);
            })
          );

          // Delete likes
          const likesRef = collection(this.firestore, 'videoLikes');
          const likesQuery = query(likesRef, where('videoId', '==', videoId));

          batch.push(
            getDocs(likesQuery).then(snapshot => {
              const deleteOperations = snapshot.docs.map(doc => deleteDoc(doc.ref));
              return Promise.all(deleteOperations);
            })
          );

          // Delete video document
          batch.push(deleteDoc(videoRef));

          return from(Promise.all(batch)).pipe(map(() => void 0));
        }
        throw new Error('Video not found');
      }),
      catchError(error => {
        console.error('Error deleting video:', error);
        throw error;
      })
    );
  }

  searchVideos(query: string): Observable<Video[]> {
    if (!query || query.trim() === '') {
      return of([]);
    }

    const q = query.toLowerCase();
    const videosRef = collection(this.firestore, 'videos');

    // Firestore doesn't support full-text search directly
    // We'll fetch videos and filter them client-side
    // For a production app, consider using Algolia, Elasticsearch, or Firebase Extensions
    return from(getDocs(videosRef)).pipe(
      map(snapshot => {
        return this.convertTimestamps(
          snapshot.docs
            .map(doc => doc.data() as Video)
            .filter(video =>
              video.title.toLowerCase().includes(q) ||
              video.description.toLowerCase().includes(q) ||
              video.userName.toLowerCase().includes(q) ||
              video.category.toLowerCase().includes(q)
            )
        );
      }),
      catchError(error => {
        console.error('Error searching videos:', error);
        return of([]);
      })
    );
  }

  private convertTimestamps(videos: Video[]): Video[] {
    return videos.map(video => this.convertTimestamp(video));
  }

  private convertTimestamp(video: Video): Video {
    const copy = { ...video };
    if (copy.createdAt && typeof copy.createdAt === 'object' && 'toDate' in copy.createdAt) {
      copy.createdAt = (copy.createdAt as unknown as Timestamp).toDate();
    }
    return copy;
  }


}
