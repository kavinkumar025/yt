import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Video } from '../../models/video.model';
import { VideoService } from '../../services/video.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  trendingVideos$: Observable<Video[]>;
  recommendedVideos$: Observable<Video[]>;
  
  loading = true;
  
  constructor(private videoService: VideoService) {}
  
  ngOnInit(): void {
    // Get trending videos (most viewed/liked videos)
    this.trendingVideos$ = this.videoService.getTrendingVideos(6);
    
    // Get recommended videos (could be personalized later)
    this.recommendedVideos$ = this.videoService.getRecentVideos(12);
    
    // Simulate loading state (will be replaced by actual loading state)
    setTimeout(() => {
      this.loading = false;
    }, 1500);
  }
}