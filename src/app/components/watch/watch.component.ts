import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { VideoService } from '../../services/video.service';
import { Video } from '../../models/video.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-watch',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './watch.component.html',
  styleUrl: './watch.component.scss'
})
export class WatchComponent implements OnInit {
  videoId: string = '';
  videoData: Video | null = null;

  constructor(
    private route: ActivatedRoute,
    private videoService: VideoService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.videoId = params.get('id') || '';
      if (this.videoId) {
        this.videoService.getVideoById(this.videoId).subscribe(video => {
          this.videoData = video;
        });
      }
    });
  }

}
