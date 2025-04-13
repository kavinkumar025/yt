import { Component, OnInit } from '@angular/core';
import { VideoService } from '../../services/video.service';
import { AuthService } from '../../services/auth.service';
import { CastService } from '../../services/cast.service';
import { Video } from '../../models/video.model';
import { UserProfile, UserRole } from '../../models/user.model';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: false

})
export class HomeComponent implements OnInit {
  trendingVideos: Video[] = [];
  recommendedVideos: Video[] = [];
  celebrityVideos: Video[] = [];
  loading: boolean = true;
  userRole$: Observable<UserRole | null>;
  
  constructor(
    private videoService: VideoService,
    private authService: AuthService,
    public castService: CastService
  ) {
    this.userRole$ = this.authService.currentUser$.pipe(
      map(user => user ? user.role : null)
    );
  }

  ngOnInit(): void {
    this.loadTrendingVideos();
    this.loadRecommendedVideos();
    this.loadCelebrityVideos();
  }

  loadTrendingVideos(): void {
    this.videoService.getTrendingVideos(8).subscribe({
      next: (videos) => {
        this.trendingVideos = videos;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading trending videos:', error);
        this.loading = false;
      }
    });
  }

  loadRecommendedVideos(): void {
    this.videoService.getRecommendedVideos('', 8).subscribe({
      next: (videos) => {
        this.recommendedVideos = videos;
      },
      error: (error) => {
        console.error('Error loading recommended videos:', error);
      }
    });
  }

  loadCelebrityVideos(): void {
    // Get videos from creators that the current user likes
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.role === UserRole.NORMAL && currentUser.likedCelebrities && currentUser.likedCelebrities.length > 0) {
      this.videoService.getVideosByCreator(currentUser.likedCelebrities).subscribe({
        next: (videos) => {
          this.celebrityVideos = videos;
        },
        error: (error) => {
          console.error('Error loading celebrity videos:', error);
        }
      });
    }
  }

  formatViewCount(views: number): string {
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
      return (views / 1000).toFixed(1) + 'K';
    } else {
      return views.toString();
    }
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return diffInSeconds + ' seconds ago';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return diffInMinutes + ' minutes ago';
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return diffInHours + ' hours ago';
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return diffInDays + ' days ago';
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return diffInWeeks + ' weeks ago';
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return diffInMonths + ' months ago';
    }
    
    const diffInYears = Math.floor(diffInDays / 365);
    return diffInYears + ' years ago';
  }

  castVideo(video: Video): void {
    this.castService.castVideo(
      video.videoURL,
      video.title,
      video.thumbnailURL,
      video.id
    ).subscribe();
  }
}