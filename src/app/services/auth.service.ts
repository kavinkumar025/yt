import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, map, of, tap, switchMap, catchError } from 'rxjs';
import { 
  Auth, 
  GoogleAuthProvider, 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  updateProfile 
} from '@angular/fire/auth';
import { 
  Firestore, 
  addDoc, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  setDoc, 
  where,
  arrayUnion,
  arrayRemove,
  updateDoc,
  orderBy,
  limit,
  DocumentReference,
  DocumentData
} from '@angular/fire/firestore';
import { UserProfile, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  isLoggedIn$ = this.currentUser$.pipe(map(user => !!user));

  constructor(
    private auth: Auth,
    private firestore: Firestore
  ) {
    // Listen for auth state changes
    this.auth.onAuthStateChanged(user => {
      if (user) {
        this.getUserData(user.uid).subscribe(userData => {
          this.currentUserSubject.next(userData);
        });
      } else {
        this.currentUserSubject.next(null);
      }
    });
  }

  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  signInWithEmail(email: string, password: string): Observable<any> {
    return from(signInWithEmailAndPassword(this.auth, email, password))
      .pipe(
        tap(result => {
          if (result.user) {
            this.updateUserData(result.user);
          }
        })
      );
  }

  signInWithGoogle(): Observable<any> {
    const provider = new GoogleAuthProvider();
    return from(signInWithPopup(this.auth, provider))
      .pipe(
        tap(result => {
          if (result.user) {
            this.updateUserData(result.user);
          }
        })
      );
  }

  register(email: string, password: string, displayName: string): Observable<any> {
    return from(createUserWithEmailAndPassword(this.auth, email, password))
      .pipe(
        tap(async result => {
          if (result.user) {
            // Update profile with display name
            await updateProfile(result.user, { displayName });
            this.updateUserData(result.user);
          }
        })
      );
  }

  private updateUserData(user: User): Observable<void> {
    const userRef = doc(this.firestore, `users/${user.uid}`);
    
    return from(getDoc(userRef)).pipe(
      switchMap(docSnap => {
        const userData: UserProfile = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: docSnap.exists() 
            ? docSnap.data()['role'] || UserRole.NORMAL
            : UserRole.NORMAL,
          createdAt: docSnap.exists() 
            ? docSnap.data()['createdAt'] 
            : new Date(),
          subscribers: docSnap.exists() 
            ? docSnap.data()['subscribers'] || 0 
            : 0,
          subscribedTo: docSnap.exists() 
            ? docSnap.data()['subscribedTo'] || [] 
            : [],
          likedCelebrities: docSnap.exists()
            ? docSnap.data()['likedCelebrities'] || []
            : [],
          favoriteDirectors: docSnap.exists()
            ? docSnap.data()['favoriteDirectors'] || []
            : []
        };
        
        this.currentUserSubject.next(userData);
        return from(setDoc(userRef, userData, { merge: true }));
      }),
      map(() => void 0)
    );
  }

  getUserData(uid: string): Observable<UserProfile> {
    const userRef = doc(this.firestore, `users/${uid}`);
    
    return from(getDoc(userRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return docSnap.data() as UserProfile;
        } else {
          // If user document doesn't exist yet, create a minimal profile
          const minimalProfile: UserProfile = {
            uid,
            email: this.auth.currentUser?.email || null,
            displayName: this.auth.currentUser?.displayName || null,
            photoURL: this.auth.currentUser?.photoURL || null,
            role: UserRole.NORMAL, // Default role is normal user
            createdAt: new Date(),
            subscribers: 0,
            subscribedTo: [],
            likedCelebrities: [],
            favoriteDirectors: []
          };
          return minimalProfile;
        }
      })
    );
  }
  
  // Update user role (admin functionality)
  updateUserRole(userId: string, newRole: UserRole): Observable<void> {
    if (!this.currentUserSubject.value) {
      return of(void 0);
    }
    
    const userRef = doc(this.firestore, `users/${userId}`);
    return from(updateDoc(userRef, { role: newRole })).pipe(
      tap(() => {
        // If we're updating the current user, update the BehaviorSubject
        if (userId === this.currentUserSubject.value?.uid) {
          const currentUser = { ...this.currentUserSubject.value };
          currentUser.role = newRole;
          this.currentUserSubject.next(currentUser);
        }
      }),
      map(() => void 0),
      catchError(error => {
        console.error('Error updating user role:', error);
        return of(void 0);
      })
    );
  }
  
  // Get creators (for directors to message)
  getCreators(limitCount: number = 10): Observable<UserProfile[]> {
    const usersCollection = collection(this.firestore, 'users');
    const creatorsQuery = query(
      usersCollection,
      where('role', '==', UserRole.CREATOR),
      limit(limitCount)
    );
    
    return from(getDocs(creatorsQuery)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => doc.data() as UserProfile);
      })
    );
  }
  
  // Get directors (for creators to follow)
  getDirectors(limitCount: number = 10): Observable<UserProfile[]> {
    const usersCollection = collection(this.firestore, 'users');
    const directorsQuery = query(
      usersCollection,
      where('role', '==', UserRole.DIRECTOR),
      limit(limitCount)
    );
    
    return from(getDocs(directorsQuery)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => doc.data() as UserProfile);
      })
    );
  }
  
  // Like a celebrity (for normal users)
  likeCelebrity(celebrityId: string): Observable<void> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser || currentUser.role !== UserRole.NORMAL) {
      return of(void 0);
    }
    
    const userRef = doc(this.firestore, `users/${currentUser.uid}`);
    return from(updateDoc(userRef, {
      likedCelebrities: arrayUnion(celebrityId)
    })).pipe(
      tap(() => {
        const updatedUser = { ...currentUser };
        updatedUser.likedCelebrities = [...(updatedUser.likedCelebrities || []), celebrityId];
        this.currentUserSubject.next(updatedUser);
      }),
      map(() => void 0)
    );
  }
  
  // Unlike a celebrity (for normal users)
  unlikeCelebrity(celebrityId: string): Observable<void> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser || currentUser.role !== UserRole.NORMAL) {
      return of(void 0);
    }
    
    const userRef = doc(this.firestore, `users/${currentUser.uid}`);
    return from(updateDoc(userRef, {
      likedCelebrities: arrayRemove(celebrityId)
    })).pipe(
      tap(() => {
        const updatedUser = { ...currentUser };
        updatedUser.likedCelebrities = updatedUser.likedCelebrities?.filter(id => id !== celebrityId) || [];
        this.currentUserSubject.next(updatedUser);
      }),
      map(() => void 0)
    );
  }
  
  // Follow a director (for creators)
  followDirector(directorId: string): Observable<void> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser || currentUser.role !== UserRole.CREATOR) {
      return of(void 0);
    }
    
    const userRef = doc(this.firestore, `users/${currentUser.uid}`);
    return from(updateDoc(userRef, {
      favoriteDirectors: arrayUnion(directorId)
    })).pipe(
      tap(() => {
        const updatedUser = { ...currentUser };
        updatedUser.favoriteDirectors = [...(updatedUser.favoriteDirectors || []), directorId];
        this.currentUserSubject.next(updatedUser);
      }),
      map(() => void 0)
    );
  }
  
  // Unfollow a director (for creators)
  unfollowDirector(directorId: string): Observable<void> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser || currentUser.role !== UserRole.CREATOR) {
      return of(void 0);
    }
    
    const userRef = doc(this.firestore, `users/${currentUser.uid}`);
    return from(updateDoc(userRef, {
      favoriteDirectors: arrayRemove(directorId)
    })).pipe(
      tap(() => {
        const updatedUser = { ...currentUser };
        updatedUser.favoriteDirectors = updatedUser.favoriteDirectors?.filter(id => id !== directorId) || [];
        this.currentUserSubject.next(updatedUser);
      }),
      map(() => void 0)
    );
  }

  signOut(): Observable<void> {
    return from(firebaseSignOut(this.auth)).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
      })
    );
  }

  subscribeToChannel(channelId: string): Observable<void> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      return of(void 0);
    }

    const userRef = doc(this.firestore, `users/${currentUser.uid}`);
    const channelRef = doc(this.firestore, `users/${channelId}`);

    // Add channel to user's subscriptions
    const subscribedTo = currentUser.subscribedTo || [];
    if (!subscribedTo.includes(channelId)) {
      subscribedTo.push(channelId);
    
      return from(Promise.all([
        // Update user's subscribed channels
        setDoc(userRef, { subscribedTo }, { merge: true }),
    
        // Increment channel's subscriber count
        getDoc(channelRef).then(docSnap => {
          if (docSnap.exists()) {
            const currentSubscribers = docSnap.data()['subscribers'] || 0;
            return setDoc(channelRef, { 
              subscribers: currentSubscribers + 1 
            }, { merge: true });
          } else {
            return Promise.resolve(); // ✅ Always return a Promise
          }
        })
      ])).pipe(
        tap(() => {
          currentUser.subscribedTo = subscribedTo;
          this.currentUserSubject.next(currentUser);
        }),
        map(() => void 0)
      );
    }
    
    
    return of(void 0);
  }

  unsubscribeFromChannel(channelId: string): Observable<void> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      return of(void 0);
    }

    const userRef = doc(this.firestore, `users/${currentUser.uid}`);
    const channelRef = doc(this.firestore, `users/${channelId}`);

    // Remove channel from user's subscriptions
    const subscribedTo = currentUser.subscribedTo || [];
    const index = subscribedTo.indexOf(channelId);
    
    if (index !== -1) {
      subscribedTo.splice(index, 1);
    
      return from(Promise.all([
        // Update user's subscribed channels
        setDoc(userRef, { subscribedTo }, { merge: true }),
    
        // Decrement channel's subscriber count
        getDoc(channelRef).then(docSnap => {
          if (docSnap.exists()) {
            const currentSubscribers = docSnap.data()['subscribers'] || 0;
            return setDoc(channelRef, {
              subscribers: Math.max(0, currentSubscribers - 1)
            }, { merge: true });
          } else {
            return Promise.resolve(); // ✅ Fix: Return something always
          }
        })
      ])).pipe(
        tap(() => {
          currentUser.subscribedTo = subscribedTo;
          this.currentUserSubject.next(currentUser);
        }),
        map(() => void 0)
      );
    }
    
    
    return of(void 0);
  }

  getSubscribedChannels(): Observable<UserProfile[]> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser || !currentUser.subscribedTo || currentUser.subscribedTo.length === 0) {
      return of([]);
    }

    const channelsCollection = collection(this.firestore, 'users');
    const channelsQuery = query(
      channelsCollection, 
      where('uid', 'in', currentUser.subscribedTo)
    );
    
    return from(getDocs(channelsQuery)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => doc.data() as UserProfile);
      })
    );
  }
}