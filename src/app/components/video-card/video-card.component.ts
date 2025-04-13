import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Video } from '../../models/video.model';
import { formatDistanceToNow } from 'date-fns';

@Component({
  selector: 'app-video-card',
  templateUrl: './video-card.component.html',
  styleUrls: ['./video-card.component.scss']
})
export class VideoCardComponent implements OnInit {
  @Input() video: Video;
  @Input() isHorizontal = false;
  
  timeAgo: string;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.formatTimeAgo();
  }

  formatTimeAgo(): void {
    if (this.video && this.video.createdAt) {
      this.timeAgo = formatDistanceToNow(this.video.createdAt, { addSuffix: true });
    }
  }

  formatViews(views: number): string {
    if (views >= 1_000_000) {
      return (views / 1_000_000).toFixed(1) + 'M';
    }
    if (views >= 1_000) {
      return (views / 1_000).toFixed(1) + 'K';
    }
    return views.toString();
  }

  watchVideo(): void {
    this.router.navigate(['/watch', this.video.id]);
  }
}
