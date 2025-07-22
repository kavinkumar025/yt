import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { Video } from '../../models/video.model';
import { VideoService } from '../../services/video.service';
import { formatDistanceToNow } from 'date-fns';

interface Category {
  name: string;
  icon: string;
  videoCount: number;
  slug: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  trendingVideos$: Observable<Video[]>;
  recommendedVideos$: Observable<Video[]>;
  
  loading = true;
  selectedFilter = 'all';
  
  categories: Category[] = [
    { name: 'Gaming', icon: '🎮', videoCount: 1250, slug: 'gaming' },
    { name: 'Music', icon: '🎵', videoCount: 890, slug: 'music' },
    { name: 'Education', icon: '📚', videoCount: 650, slug: 'education' },
    { name: 'Technology', icon: '💻', videoCount: 420, slug: 'technology' },
    { name: 'Entertainment', icon: '🎭', videoCount: 1100, slug: 'entertainment' },
    { name: 'Sports', icon: '⚽', videoCount: 340, slug: 'sports' },
    { name: 'Cooking', icon: '👨‍🍳', videoCount: 280, slug: 'cooking' },
    { name: 'Travel', icon: '✈️', videoCount: 190, slug: 'travel' }
  ];
  
  private subscription: Subscription = new Subscription();
  
  constructor(private videoService: VideoService) {}
  
  ngOnInit(): void {
    this.loadVideos();
  }
  
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
  
  private loadVideos(): void {
    // Get trending videos (most viewed/liked videos)
    this.trendingVideos$ = this.videoService.getTrendingVideos(6);
    
    // Get recommended videos (could be personalized later)
    this.recommendedVideos$ = this.videoService.getRecentVideos(12);
    
    // Wait for both observables to complete before hiding loading
    this.subscription.add(
      combineLatest([this.trendingVideos$, this.recommendedVideos$]).subscribe({
        next: ([trending, recommended]) => {
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading home data:', error);
          this.loading = false;
        }
      })
    );
  }
  
  setFilter(filter: string): void {
    this.selectedFilter = filter;
    // TODO: Implement filtering logic based on selected filter
    // For now, just update the UI state
  }
  
  formatViewCount(views: number): string {
    if (views >= 1_000_000) {
      return (views / 1_000_000).toFixed(1) + 'M';
    }
    if (views >= 1_000) {
      return (views / 1_000).toFixed(1) + 'K';
    }
    return views.toString();
  }
  
  formatTimeAgo(date: Date): string {
    return formatDistanceToNow(date, { addSuffix: true });
  }
  
  addToWatchLater(video: Video): void {
    // TODO: Implement watch later functionality
    console.log('Added to watch later:', video.title);
  }
  
  shareVideo(video: Video): void {
    // TODO: Implement share functionality
    if (navigator.share) {
      navigator.share({
        title: video.title,
        text: `Check out this video: ${video.title}`,
        url: `/video/${video.id}`
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(`${window.location.origin}/video/${video.id}`);
      console.log('Video link copied to clipboard');
    }
  }
}