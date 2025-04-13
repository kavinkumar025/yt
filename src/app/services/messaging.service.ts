import { Injectable } from '@angular/core';
import { Observable, from, map, of, switchMap } from 'rxjs';
import {
  Firestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  getDoc,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  limit
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Message } from '../models/message.model';
import { UserProfile, UserRole } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  
  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {}
  
  // Send message from director to creator
  sendDirectorMessage(creatorId: string, content: string): Observable<string> {
    const currentUser = this.authService.getCurrentUser();
    
    // Only directors can send messages to creators
    if (!currentUser || currentUser.role !== UserRole.DIRECTOR) {
      return of('');
    }
    
    const messagesCollection = collection(this.firestore, 'messages');
    
    const newMessage: Message = {
      senderId: currentUser.uid,
      receiverId: creatorId,
      content,
      timestamp: new Date(),
      read: false,
      senderName: currentUser.displayName || 'Unknown Director',
      senderPhoto: currentUser.photoURL || undefined
    };
    
    return from(addDoc(messagesCollection, newMessage)).pipe(
      map(docRef => docRef.id)
    );
  }
  
  // Send message from creator to director
  sendCreatorMessage(directorId: string, content: string): Observable<string> {
    const currentUser = this.authService.getCurrentUser();
    
    // Only creators can respond to directors
    if (!currentUser || currentUser.role !== UserRole.CREATOR) {
      return of('');
    }
    
    const messagesCollection = collection(this.firestore, 'messages');
    
    const newMessage: Message = {
      senderId: currentUser.uid,
      receiverId: directorId,
      content,
      timestamp: new Date(),
      read: false,
      senderName: currentUser.displayName || 'Unknown Creator',
      senderPhoto: currentUser.photoURL || undefined
    };
    
    return from(addDoc(messagesCollection, newMessage)).pipe(
      map(docRef => docRef.id)
    );
  }
  
  // Get conversation between director and creator
  getConversation(otherUserId: string): Observable<Message[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of([]);
    }
    
    const messagesCollection = collection(this.firestore, 'messages');
    const messagesQuery = query(
      messagesCollection,
      where('senderId', 'in', [currentUser.uid, otherUserId]),
      where('receiverId', 'in', [currentUser.uid, otherUserId]),
      orderBy('timestamp', 'asc')
    );
    
    return new Observable<Message[]>(observer => {
      const unsubscribe = onSnapshot(messagesQuery, 
        (querySnapshot) => {
          const messages: Message[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const message: Message = {
              id: doc.id,
              senderId: data['senderId'],
              receiverId: data['receiverId'],
              content: data['content'],
              timestamp: data['timestamp']?.toDate() || new Date(),
              read: data['read'] || false,
              senderName: data['senderName'],
              senderPhoto: data['senderPhoto']
            };
            messages.push(message);
          });
          observer.next(messages);
        },
        (error) => {
          console.error('Error fetching messages:', error);
          observer.error(error);
        }
      );
      
      // Return the unsubscribe function to clean up when the observable is unsubscribed
      return unsubscribe;
    });
  }
  
  // Mark message as read
  markAsRead(messageId: string): Observable<void> {
    const messageRef = doc(this.firestore, `messages/${messageId}`);
    return from(updateDoc(messageRef, { read: true })).pipe(
      map(() => void 0)
    );
  }
  
  // Get unread messages count for current user
  getUnreadMessagesCount(): Observable<number> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of(0);
    }
    
    const messagesCollection = collection(this.firestore, 'messages');
    const unreadQuery = query(
      messagesCollection,
      where('receiverId', '==', currentUser.uid),
      where('read', '==', false)
    );
    
    return from(getDocs(unreadQuery)).pipe(
      map(querySnapshot => querySnapshot.size)
    );
  }
  
  // Get recent conversations for the current user (for messaging inbox)
  getRecentConversations(): Observable<{user: UserProfile, lastMessage: Message}[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of([]);
    }
    
    // Get messages where current user is sender or receiver
    const messagesCollection = collection(this.firestore, 'messages');
    const sentMessagesQuery = query(
      messagesCollection,
      where('senderId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    
    const receivedMessagesQuery = query(
      messagesCollection,
      where('receiverId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    
    // Combine sent and received messages and find unique conversations
    return from(Promise.all([
      getDocs(sentMessagesQuery),
      getDocs(receivedMessagesQuery)
    ])).pipe(
      switchMap(([sentSnapshots, receivedSnapshots]) => {
        const conversations = new Map<string, Message>();
        
        // Process sent messages
        sentSnapshots.forEach(doc => {
          const message = this.convertMessageDoc(doc);
          const otherUserId = message.receiverId;
          
          if (!conversations.has(otherUserId) || 
              conversations.get(otherUserId)!.timestamp < message.timestamp) {
            conversations.set(otherUserId, message);
          }
        });
        
        // Process received messages
        receivedSnapshots.forEach(doc => {
          const message = this.convertMessageDoc(doc);
          const otherUserId = message.senderId;
          
          if (!conversations.has(otherUserId) || 
              conversations.get(otherUserId)!.timestamp < message.timestamp) {
            conversations.set(otherUserId, message);
          }
        });
        
        // Get user profiles for each conversation
        const userPromises = Array.from(conversations.keys()).map(userId => 
          this.authService.getUserData(userId).toPromise()
        );
        
        return from(Promise.all(userPromises)).pipe(
          map(users => {
            return users.filter(Boolean).map((user, index) => {
              const userId = Array.from(conversations.keys())[index];
              return {
                user: user!,
                lastMessage: conversations.get(userId)!
              };
            }).sort((a, b) => 
              b.lastMessage.timestamp.getTime() - a.lastMessage.timestamp.getTime()
            );
          })
        );
      })
    );
  }
  
  private convertMessageDoc(doc: QueryDocumentSnapshot<DocumentData>): Message {
    const data = doc.data();
    return {
      id: doc.id,
      senderId: data['senderId'],
      receiverId: data['receiverId'],
      content: data['content'],
      timestamp: data['timestamp']?.toDate() || new Date(),
      read: data['read'] || false,
      senderName: data['senderName'],
      senderPhoto: data['senderPhoto']
    };
  }
}