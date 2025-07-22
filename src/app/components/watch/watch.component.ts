import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
// import { Firestore, doc, getDoc } from 'firebase/firestore';
import { VideoService } from '../../services/video.service';
import { Video } from '../../models/video.model';
import { CommonModule } from '@angular/common';
// import { Firestore, doc, updateDoc, increment } from 'firebase/firestore';

import { Firestore } from '@angular/fire/firestore';
import { doc, updateDoc, increment } from 'firebase/firestore';


declare var cast: any;
declare var chrome: any;

@Component({
  selector: 'app-watch',
  standalone: false,
  // imports: [CommonModule],
  templateUrl: './watch.component.html',
  styleUrl: './watch.component.scss'
})
export class WatchComponent implements OnInit {
  public videoId: string = '';
  public videoData: Video | null = null;
  public hasViewed = false;
  public liked = false;
  public disliked = false;
  public commentText: string = '';
  public comments: any[] = [];

  constructor(
    public route: ActivatedRoute,
    public videoService: VideoService,
    public firestore: Firestore
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.videoId = params.get('id') || '';
      if (this.videoId) {
        this.videoService.getVideoById(this.videoId).subscribe(video => {
          this.videoData = video;
        });

        this.videoService.getComments(this.videoId).subscribe(comments => {
          this.comments = comments;
        });
      }
    });
  }

  onVideoPlay(): void {
    if (this.hasViewed || !this.videoId) return;
    this.hasViewed = true;
    const videoRef = doc(this.firestore, `videos/${this.videoId}`);
    updateDoc(videoRef, { 'stats.views': increment(1) })
      .then(() => console.log('View count updated'));
  }

  onLike(): void {
    if (this.liked || !this.videoId) return;
    this.liked = true;
    this.disliked = false;

    const videoRef = doc(this.firestore, `videos/${this.videoId}`);
    updateDoc(videoRef, { 'stats.likes': increment(1) })
      .then(() => console.log('Like updated'));
  }

  onDislike(): void {
    if (this.disliked || !this.videoId) return;
    this.disliked = true;
    this.liked = false;

    const videoRef = doc(this.firestore, `videos/${this.videoId}`);
    updateDoc(videoRef, { 'stats.dislikes': increment(1) })
      .then(() => console.log('Dislike updated'));
  }

  // addComment(): void {
  //   if (!this.commentText.trim()) return;
  
  //   this.videoService.addComment(this.videoId, this.commentText, 'Anonymous').subscribe({
  //     next: (commentId) => {
  //       console.log('Comment added successfully with ID:', commentId);
  //       this.commentText = ''; // Reset after adding comment
  //     },
  //     error: (error) => {
  //       console.error('Error adding comment:', error);
  //     }
  //   });
  // }

  addComment(): void {
    if (!this.commentText.trim() || !this.videoId) return;
  
    this.videoService.addComment(this.videoId, this.commentText).subscribe({
      next: (commentId) => {
        console.log('Comment added successfully with ID:', commentId);
        this.commentText = ''; // Reset after adding comment
        
        // Reload comments to show the new one
        this.videoService.getComments(this.videoId).subscribe(comments => {
          this.comments = comments;
        });
        
        // Update comment count in video data
        if (this.videoData) {
          this.videoData.stats.comments++;
        }
      },
      error: (error) => {
        console.error('Error adding comment:', error);
      }
    });
  }

  shareVideo(): void {
    if (navigator.share) {
      navigator.share({
        title: this.videoData?.title || 'Check out this video!',
        text: this.videoData?.description || '',
        url: window.location.href
      }).then(() => {
        console.log('Video shared successfully');
      }).catch((error) => {
        console.error('Error sharing video:', error);
        this.fallbackShare();
      });
    } else {
      this.fallbackShare();
    }
  }

  private fallbackShare(): void {
    // Fallback for browsers that don't support Web Share API
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        console.log('URL copied to clipboard');
        // You could show a toast notification here
      }).catch((error) => {
        console.error('Error copying to clipboard:', error);
      });
    }
  }
  

  castScreen(): void {
    const context = cast.framework.CastContext.getInstance();
    context.setOptions({
      receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });

    const mediaInfo = new chrome.cast.media.MediaInfo(this.videoData?.videoURL, 'video/mp4');
    const request = new chrome.cast.media.LoadRequest(mediaInfo);
    const session = context.getCurrentSession();

    if (session) {
      session.loadMedia(request).then(
        () => console.log('Media loaded to cast device'),
        (error: any) => console.error('Casting error:', error)
      );
    } else {
      console.warn('No cast session available.');
    }
  }
}
