import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VideoService } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';
import { Video } from '../../models/video.model';
import { ToastrService } from 'ngx-toastr';
import { FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { formatDistanceToNow } from 'date-fns';

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.scss']
})
export class VideoPlayerComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayerRef: ElementRef<HTMLVideoElement>;

  video: Video;
  recommendedVideos: Video[] = [];
  comments: any[] = [];

  isLoading = true;
  isLoadingRecommended = true;
  isLoadingComments = true;

  userLikeStatus: 'like' | 'dislike' | null = null;
  isSubscribed = false;

  commentControl = new FormControl('', [Validators.required, Validators.maxLength(1000)]);
  isSubmittingComment = false;

  private routeSub: Subscription;
  private authSub: Subscription;

  constructor(
    private route: ActivatedRoute,
    private videoService: VideoService,
    public authService: AuthService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const videoId = params.get('id');
      if (videoId) {
        this.loadVideo(videoId);
      }
    });

    this.authSub = this.authService.currentUser$.subscribe(user => {
      if (user && this.video) {
        this.checkIfSubscribed(user.uid, this.video.userId);
        this.getUserLikeStatus();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  loadVideo(videoId: string): void {
    this.isLoading = true;
    this.videoService.getVideoById(videoId).subscribe({
      next: (video) => {
        this.video = video;
        this.isLoading = false;

        this.loadRecommendedVideos(videoId);
        this.loadComments(videoId);
        this.getUserLikeStatus();

        const currentUser = this.authService.getCurrentUser();
        if (currentUser) {
          this.checkIfSubscribed(currentUser.uid, video.userId);
        }
      },
      error: (error) => {
        console.error('Error loading video:', error);
        this.toastr.error('Error loading video. Please try again.');
        this.isLoading = false;
      }
    });
  }

  loadRecommendedVideos(currentVideoId: string): void {
    this.isLoadingRecommended = true;
    this.videoService.getRecommendedVideos(currentVideoId, 10).subscribe({
      next: (videos) => {
        this.recommendedVideos = videos;
        this.isLoadingRecommended = false;
      },
      error: (error) => {
        console.error('Error loading recommended videos:', error);
        this.isLoadingRecommended = false;
      }
    });
  }

  loadComments(videoId: string): void {
    this.isLoadingComments = true;
    this.videoService.getComments(videoId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.isLoadingComments = false;
      },
      error: (error) => {
        console.error('Error loading comments:', error);
        this.isLoadingComments = false;
      }
    });
  }

  getUserLikeStatus(): void {
    if (!this.video || !this.authService.getCurrentUser()) {
      return;
    }

    this.videoService.getUserLikeStatus(this.video.id).subscribe({
      next: (status) => {
        this.userLikeStatus = status;
      },
      error: (error) => {
        console.error('Error getting like status:', error);
      }
    });
  }

  checkIfSubscribed(userId: string, channelId: string): void {
    // In a real app, this would check if the user is subscribed to the channel
    // For now, we'll check if the channel ID is in the user's subscribed channels
    const user = this.authService.getCurrentUser();
    if (user && user.subscribedTo) {
      this.isSubscribed = user.subscribedTo.includes(channelId);
    } else {
      this.isSubscribed = false;
    }
  }

  likeVideo(): void {
    if (!this.video) return;

    if (!this.authService.getCurrentUser()) {
      this.toastr.info('Please sign in to like videos', 'Sign in required');
      return;
    }

    this.videoService.likeVideo(this.video.id).subscribe({
      next: () => {
        if (this.userLikeStatus === 'like') {
          this.userLikeStatus = null;
          this.video.stats.likes--;
        } else {
          if (this.userLikeStatus === 'dislike') {
            this.video.stats.dislikes--;
          }
          this.userLikeStatus = 'like';
          this.video.stats.likes++;
        }
      },
      error: (error) => {
        console.error('Error liking video:', error);
        this.toastr.error('Error liking video. Please try again.');
      }
    });
  }

  dislikeVideo(): void {
    if (!this.video) return;
    if (!this.authService.getCurrentUser()) {
      this.toastr.info('Please sign in to dislike videos', 'Sign in required');
      return;
    }
    this.videoService.dislikeVideo(this.video.id).subscribe({
      next: () => {
        if (this.userLikeStatus === 'dislike') {
          this.userLikeStatus = null;
          this.video.stats.dislikes--;
        } else {
          if (this.userLikeStatus === 'like') {
            this.video.stats.likes--;
          }
          this.userLikeStatus = 'dislike';
          this.video.stats.dislikes++;
        }
      },
      error: (error) => {
        console.error('Error disliking video:', error);
        this.toastr.error('Error disliking video. Please try again.');
      }
    });
  }

  subscribeToChannel(): void {
    if (!this.video) return;
    if (!this.authService.getCurrentUser()) {
      this.toastr.info('Please sign in to subscribe to channels', 'Sign in required');
      return;
    }
    if (this.isSubscribed) {
      this.authService.unsubscribeFromChannel(this.video.userId).subscribe({
        next: () => {
          this.isSubscribed = false;
          this.toastr.success('Unsubscribed successfully');
        },
        error: (error) => {
          console.error('Error unsubscribing:', error);
          this.toastr.error('Error unsubscribing. Please try again.');
        }
      });
    } else {
      this.authService.subscribeToChannel(this.video.userId).subscribe({
        next: () => {
          this.isSubscribed = true;
          this.toastr.success('Subscribed successfully');
        },
        error: (error) => {
          console.error('Error subscribing:', error);
          this.toastr.error('Error subscribing. Please try again.');
        }
      });
    }
  }

  submitComment(): void {
    if (!this.video) return;
    if (!this.authService.getCurrentUser()) {
      this.toastr.info('Please sign in to comment', 'Sign in required');
      return;
    }
    if (this.commentControl.invalid) {
      return;
    }
    this.isSubmittingComment = true;
    const commentText = this.commentControl.value;
    this.videoService.addComment(this.video.id, commentText).subscribe({
      next: (commentId) => {
        this.isSubmittingComment = false;
        this.commentControl.reset();
        // Reload comments to show the new one
        this.loadComments(this.video.id);
        // Update comment count
        this.video.stats.comments++;
        this.toastr.success('Comment added successfully');
      },
      error: (error) => {
        this.isSubmittingComment = false;
        console.error('Error adding comment:', error);
        this.toastr.error('Error adding comment. Please try again.');
      }
    });
  }

  formatTimeAgo(date: Date): string {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  formatNumber(num: number): string {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M';
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  shareVideo(): void {
    if (navigator.share) {
      navigator.share({
        title: this.video.title,
        text: this.video.description,
        url: window.location.href
      })
        .then(() => this.toastr.success('Shared successfully'))
        .catch((error) => console.error('Error sharing:', error));
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href)
        .then(() => this.toastr.success('Link copied to clipboard'))
        .catch((error) => console.error('Error copying to clipboard:', error));
    }
  }
}
