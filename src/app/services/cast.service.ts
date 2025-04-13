import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CastService {
  // Track whether casting is active
  private castingActiveSubject = new BehaviorSubject<boolean>(false);
  castingActive$ = this.castingActiveSubject.asObservable();
  
  // Store information about the video being cast
  private castVideoIdSubject = new BehaviorSubject<string | null>(null);
  castVideoId$ = this.castVideoIdSubject.asObservable();
  
  // Store the cast receiver name
  private castReceiverNameSubject = new BehaviorSubject<string | null>(null);
  castReceiverName$ = this.castReceiverNameSubject.asObservable();
  
  // Store cast position
  private castPositionSubject = new BehaviorSubject<number>(0);
  castPosition$ = this.castPositionSubject.asObservable();
  
  private castSession: any = null;
  private castReceiver: any = null;
  
  constructor() {
    // Initialize the cast API if available
    this.initializeCastApi();
    
    // Set up window message listener for cross-device communication
    window.addEventListener('message', this.handleCastMessage.bind(this));
  }
  
  // Initialize the Google Cast API if available
  private initializeCastApi(): void {
    if (typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.cast) {
      const context = (window as any).cast.framework.CastContext.getInstance();
      
      if (context) {
        context.setOptions({
          receiverApplicationId: (window as any).chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: (window as any).chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
        });
        
        // Listen for session changes
        context.addEventListener(
          (window as any).cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
          this.onSessionStateChange.bind(this)
        );
      }
    }
  }
  
  // Handle session state changes
  private onSessionStateChange(event: any): void {
    const session = (window as any).cast.framework.CastContext.getInstance().getCurrentSession();
    
    if (session) {
      this.castSession = session;
      this.castReceiverNameSubject.next(session.getCastDevice().friendlyName);
      this.castingActiveSubject.next(true);
      
      // Listen for media status updates
      session.getMediaSession()?.addUpdateListener(this.onMediaStatusUpdate.bind(this));
    } else {
      this.castSession = null;
      this.castingActiveSubject.next(false);
      this.castReceiverNameSubject.next(null);
      this.castVideoIdSubject.next(null);
    }
  }
  
  // Handle media status updates
  private onMediaStatusUpdate(): void {
    if (this.castSession && this.castSession.getMediaSession()) {
      const mediaSession = this.castSession.getMediaSession();
      this.castPositionSubject.next(mediaSession.getEstimatedTime());
    }
  }
  
  // Handle cross-device cast messages
  private handleCastMessage(event: MessageEvent): void {
    if (event.data && event.data.type === 'CAST_MESSAGE') {
      // Update casting UI based on message from another device
      this.castingActiveSubject.next(event.data.isCasting || false);
      this.castVideoIdSubject.next(event.data.videoId || null);
      this.castReceiverNameSubject.next(event.data.receiverName || null);
      this.castPositionSubject.next(event.data.position || 0);
    }
  }
  
  // Start casting a video
  castVideo(videoUrl: string, title: string, thumbnailUrl: string, videoId: string): Observable<boolean> {
    if (!this.isCastApiAvailable()) {
      // If cast API not available, try web-based casting via messaging
      this.broadcastCastIntent(videoId, videoUrl, title);
      return of(false);
    }
    
    // Create media info for the video
    const mediaInfo = new (window as any).chrome.cast.media.MediaInfo(videoUrl, 'video/mp4');
    mediaInfo.metadata = new (window as any).chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = title;
    mediaInfo.metadata.images = [{ url: thumbnailUrl }];
    
    const request = new (window as any).chrome.cast.media.LoadRequest(mediaInfo);
    
    // Get current session or create a new one
    const context = (window as any).cast.framework.CastContext.getInstance();
    const session = context.getCurrentSession();
    
    if (session) {
      // Update state
      this.castVideoIdSubject.next(videoId);
      
      // Load the media
      return from(
        session.loadMedia(request)
          .then(() => true)
          .catch((error: any) => {
            console.error('Error casting video:', error);
            return false;
          })
      ).pipe(map(result => !!result));
    } else {
      // Request a new session
      return from(
        context.requestSession()
          .then((newSession: any) => {
            this.castSession = newSession;
            this.castReceiverNameSubject.next(newSession.getCastDevice().friendlyName);
            this.castingActiveSubject.next(true);
            this.castVideoIdSubject.next(videoId);
            
            return newSession.loadMedia(request);
          })
          .then(() => true)
          .catch((error: any) => {
            console.error('Error casting video:', error);
            return false;
          })
      ).pipe(map(result => !!result));
    }
  }
  
  // Stop casting
  stopCasting(): Observable<boolean> {
    if (this.castSession) {
      return from(
        this.castSession.endSession(true)
          .then(() => {
            this.castingActiveSubject.next(false);
            this.castVideoIdSubject.next(null);
            return true;
          })
          .catch((error: any) => {
            console.error('Error ending cast session:', error);
            return false;
          })
      ).pipe(map(result => !!result));
    } else {
      // If using web-based casting, broadcast stop intent
      this.broadcastStopCastIntent();
      
      // Update local state
      this.castingActiveSubject.next(false);
      this.castVideoIdSubject.next(null);
      return of(true);
    }
  }
  
  // Check if Google Cast API is available
  isCastApiAvailable(): boolean {
    return typeof window !== 'undefined' && 
           !!(window as any).chrome && 
           !!(window as any).chrome.cast;
  }
  
  // Get available cast receivers
  getAvailableReceivers(): Observable<string[]> {
    if (this.isCastApiAvailable()) {
      const context = (window as any).cast.framework.CastContext.getInstance();
      const devices = context.getCastState() === (window as any).cast.framework.CastState.NOT_CONNECTED 
        ? [] 
        : [context.getCurrentSession()?.getCastDevice()?.friendlyName || 'Unknown device'];
      
      return of(devices);
    } else {
      // For web-based casting, we'd have to implement device discovery
      // Return empty array for now
      return of([]);
    }
  }
  
  // Play/pause the current cast
  togglePlayPause(): void {
    if (this.castSession && this.castSession.getMediaSession()) {
      const mediaSession = this.castSession.getMediaSession();
      
      if (mediaSession.playerState === (window as any).chrome.cast.media.PlayerState.PLAYING) {
        mediaSession.pause(null);
      } else {
        mediaSession.play(null);
      }
    } else {
      // For web-based casting
      this.broadcastPlayPauseIntent();
    }
  }
  
  // Seek to a specific position
  seekTo(position: number): void {
    if (this.castSession && this.castSession.getMediaSession()) {
      const request = new (window as any).chrome.cast.media.SeekRequest();
      request.currentTime = position;
      this.castSession.getMediaSession().seek(request);
    } else {
      // For web-based casting
      this.broadcastSeekIntent(position);
    }
  }
  
  // For web-based casting, broadcast intents to other devices
  private broadcastCastIntent(videoId: string, videoUrl: string, title: string): void {
    if (typeof window !== 'undefined') {
      // Update local state
      this.castingActiveSubject.next(true);
      this.castVideoIdSubject.next(videoId);
      this.castReceiverNameSubject.next('Web Receiver');
      
      // Broadcast to other tabs/windows
      const castMessage = {
        type: 'CAST_MESSAGE',
        isCasting: true,
        videoId,
        videoUrl,
        title,
        receiverName: 'Web Receiver',
        position: 0
      };
      
      window.localStorage.setItem('castState', JSON.stringify(castMessage));
      
      try {
        // Broadcast to other tabs/windows
        window.postMessage(castMessage, '*');
      } catch (e) {
        console.error('Error broadcasting cast intent:', e);
      }
    }
  }
  
  private broadcastStopCastIntent(): void {
    if (typeof window !== 'undefined') {
      const castMessage = {
        type: 'CAST_MESSAGE',
        isCasting: false,
        videoId: null,
        receiverName: null,
        position: 0
      };
      
      window.localStorage.removeItem('castState');
      
      try {
        // Broadcast to other tabs/windows
        window.postMessage(castMessage, '*');
      } catch (e) {
        console.error('Error broadcasting stop cast intent:', e);
      }
    }
  }
  
  private broadcastPlayPauseIntent(): void {
    if (typeof window !== 'undefined') {
      const castMessage = {
        type: 'CAST_MESSAGE',
        action: 'TOGGLE_PLAY_PAUSE',
        videoId: this.castVideoIdSubject.value
      };
      
      try {
        // Broadcast to other tabs/windows
        window.postMessage(castMessage, '*');
      } catch (e) {
        console.error('Error broadcasting play/pause intent:', e);
      }
    }
  }
  
  private broadcastSeekIntent(position: number): void {
    if (typeof window !== 'undefined') {
      const castMessage = {
        type: 'CAST_MESSAGE',
        action: 'SEEK',
        videoId: this.castVideoIdSubject.value,
        position
      };
      
      try {
        // Broadcast to other tabs/windows
        window.postMessage(castMessage, '*');
      } catch (e) {
        console.error('Error broadcasting seek intent:', e);
      }
    }
  }
}