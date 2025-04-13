import { Injectable } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';
import {
  Firestore,
  collection,
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
import { Document, DocumentStats, DocumentUpload } from '../models/document.model';
import { AuthService } from './auth.service';
import {  limit as firestoreLimit } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private lastDoc: DocumentSnapshot | null = null;

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private authService: AuthService
  ) {}

  uploadDocument(docData: DocumentUpload, file: File): Observable<string> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of('');
    }

    const documentId = doc(collection(this.firestore, 'dummy')).id;
    const filePath = `documents/${currentUser.uid}/${documentId}`;
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
            // Document successfully uploaded, create database entry
            const documentRef = doc(this.firestore, `documents/${documentId}`);
            const documentStats: DocumentStats = {
              views: 0,
              downloads: 0,
              likes: 0
            };

            const documentDoc = {
              id: documentId,
              title: docData.title,
              description: docData.description,
              category: docData.category,
              fileURL: downloadURL,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              createdAt: serverTimestamp(),
              userId: currentUser.uid,
              userName: currentUser.displayName || 'Unknown User',
              userPhotoURL: currentUser.photoURL || '',
              stats: documentStats
            };

            setDoc(documentRef, documentDoc)
              .then(() => {
                observer.next(documentId);
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

  getRecentDocuments(limit: number = 8): Observable<Document[]> {
    const documentsRef = collection(this.firestore, 'documents');
    const q = query(
      documentsRef,
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    return from(getDocs(q)).pipe(
      map(snapshot => {
        this.lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
        return this.convertTimestamps(snapshot.docs.map(doc => doc.data() as Document));
      }),
      catchError(error => {
        console.error('Error fetching recent documents:', error);
        return of([]);
      })
    );
  }

  getDocumentById(id: string): Observable<Document> {
    const documentRef = doc(this.firestore, `documents/${id}`);
    
    return from(getDoc(documentRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const document = docSnap.data() as Document;
          return this.convertTimestamp(document);
        }
        throw new Error('Document not found');
      }),
      catchError(error => {
        console.error('Error fetching document:', error);
        throw error;
      })
    );
  }

  getUserDocuments(userId: string, limit: number = 8): Observable<Document[]> {
    const documentsRef = collection(this.firestore, 'documents');
    const q = query(
      documentsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    return from(getDocs(q)).pipe(
      map(snapshot => this.convertTimestamps(snapshot.docs.map(doc => doc.data() as Document))),
      catchError(error => {
        console.error(`Error fetching documents for user ${userId}:`, error);
        return of([]);
      })
    );
  }

  deleteDocument(documentId: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(void 0);
    }

    const documentRef = doc(this.firestore, `documents/${documentId}`);
    
    return from(getDoc(documentRef)).pipe(
      switchMap(docSnap => {
        if (docSnap.exists()) {
          const documentData = docSnap.data() as Document;
          
          // Check if current user is the owner
          if (documentData.userId !== currentUser.uid) {
            throw new Error('You do not have permission to delete this document');
          }
          
          const batch = [];
          
          // Delete document file from storage
          if (documentData.fileURL) {
            const filePath = documentData.fileURL.split('/').pop();
            if (filePath) {
              const storageRef = ref(this.storage, `documents/${currentUser.uid}/${filePath}`);
              batch.push(deleteObject(storageRef).catch(err => console.error('Error deleting document file:', err)));
            }
          }
          
          // Delete likes
          const likesRef = collection(this.firestore, 'documentLikes');
          const likesQuery = query(likesRef, where('documentId', '==', documentId));
          
          batch.push(
            getDocs(likesQuery).then(snapshot => {
              const deleteOperations = snapshot.docs.map(doc => deleteDoc(doc.ref));
              return Promise.all(deleteOperations);
            })
          );
          
          // Delete document record
          batch.push(deleteDoc(documentRef));
          
          return from(Promise.all(batch)).pipe(map(() => void 0));
        }
        throw new Error('Document not found');
      }),
      catchError(error => {
        console.error('Error deleting document:', error);
        throw error;
      })
    );
  }

  incrementDownloadCount(documentId: string): Observable<void> {
    const documentRef = doc(this.firestore, `documents/${documentId}`);
    
    return from(getDoc(documentRef)).pipe(
      switchMap(docSnap => {
        if (docSnap.exists()) {
          const documentData = docSnap.data();
          const currentDownloads = documentData?.['stats']?.['downloads'] || 0;

          
          return from(updateDoc(documentRef, {
            'stats.downloads': currentDownloads + 1
          }));
        }
        throw new Error('Document not found');
      }),
      catchError(error => {
        console.error('Error incrementing download count:', error);
        throw error;
      })
    );
  }

  likeDocument(documentId: string): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(void 0);
    }

    const documentRef = doc(this.firestore, `documents/${documentId}`);
    const likeRef = doc(this.firestore, `documentLikes/${currentUser.uid}_${documentId}`);
    
    // First check if the user already liked this document
    return from(getDoc(likeRef)).pipe(
      switchMap(docSnap => {
        const batch = [];
        
        if (docSnap.exists()) {
          // User already liked, so remove the like
          batch.push(deleteDoc(likeRef));
          
          return from(getDoc(documentRef)).pipe(
            switchMap(docSnap => {
              if (docSnap.exists()) {
                const documentData = docSnap.data();
                const currentLikes = documentData?.['stats']?.['downloads'] || 0;
                
                batch.push(updateDoc(documentRef, {
                  'stats.likes': Math.max(0, currentLikes - 1)
                }));
              }
              
              return from(Promise.all(batch));
            })
          );
        } else {
          // New like
          batch.push(setDoc(likeRef, {
            userId: currentUser.uid,
            documentId: documentId,
            createdAt: serverTimestamp()
          }));
          
          return from(getDoc(documentRef)).pipe(
            switchMap(docSnap => {
              if (docSnap.exists()) {
                const documentData = docSnap.data();
                const currentLikes = documentData?.['stats']?.['downloads'] || 0;
                
                batch.push(updateDoc(documentRef, {
                  'stats.likes': currentLikes + 1
                }));
              }
              
              return from(Promise.all(batch));
            })
          );
        }
      }),
      map(() => void 0),
      catchError(error => {
        console.error('Error liking document:', error);
        throw error;
      })
    );
  }

  getUserLikeStatus(documentId: string): Observable<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(false);
    }

    const likeRef = doc(this.firestore, `documentLikes/${currentUser.uid}_${documentId}`);
    
    return from(getDoc(likeRef)).pipe(
      map(docSnap => docSnap.exists()),
      catchError(error => {
        console.error('Error getting like status:', error);
        return of(false);
      })
    );
  }

  searchDocuments(query: string): Observable<Document[]> {
    if (!query || query.trim() === '') {
      return of([]);
    }
    
    const q = query.toLowerCase();
    const documentsRef = collection(this.firestore, 'documents');
    
    // Firestore doesn't support full-text search directly
    // We'll fetch documents and filter them client-side
    // For a production app, consider using Algolia, Elasticsearch, or Firebase Extensions
    return from(getDocs(documentsRef)).pipe(
      map(snapshot => {
        return this.convertTimestamps(
          snapshot.docs
            .map(doc => doc.data() as Document)
            .filter(document => 
              document.title.toLowerCase().includes(q) || 
              document.description.toLowerCase().includes(q) ||
              document.userName.toLowerCase().includes(q) ||
              document.category.toLowerCase().includes(q) ||
              document.fileName.toLowerCase().includes(q)
            )
        );
      }),
      catchError(error => {
        console.error('Error searching documents:', error);
        return of([]);
      })
    );
  }

  private convertTimestamps(documents: Document[]): Document[] {
    return documents.map(document => this.convertTimestamp(document));
  }

  private convertTimestamp(document: Document): Document {
    const copy = { ...document };
    if (copy.createdAt && typeof copy.createdAt === 'object' && 'toDate' in copy.createdAt) {
      copy.createdAt = (copy.createdAt as unknown as Timestamp).toDate();
    }
    return copy;
  }
}

function setDoc(docRef: any, data: any): Promise<void> {
  const ref = doc(collection(docRef.firestore, docRef.path.split('/')[0]), docRef.id);
  return updateDoc(ref, data)
    .catch(() => {
      // If document doesn't exist, create it
      return updateDoc(docRef, data);
    });
}