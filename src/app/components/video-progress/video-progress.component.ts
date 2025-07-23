import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-video-progress',
  templateUrl: './video-progress.component.html',
  styleUrls: ['./video-progress.component.scss']
})
export class VideoProgressComponent implements OnInit, OnDestroy {
  @Input() currentTime: number = 0;
  @Input() duration: number = 0;
  @Input() buffered: number = 0;
  @Output() seek = new EventEmitter<number>();

  isDragging = false;
  private animationFrame: number;

  ngOnInit() {
    this.startProgressAnimation();
  }

  ngOnDestroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  startProgressAnimation() {
    const animate = () => {
      // Smooth progress updates
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  onProgressClick(event: MouseEvent) {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * this.duration;
    this.seek.emit(newTime);
  }

  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.onProgressClick(event);
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      this.onProgressClick(event);
    }
  }

  onMouseUp() {
    this.isDragging = false;
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  get progressPercentage(): number {
    return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
  }

  get bufferedPercentage(): number {
    return this.duration > 0 ? (this.buffered / this.duration) * 100 : 0;
  }
}
