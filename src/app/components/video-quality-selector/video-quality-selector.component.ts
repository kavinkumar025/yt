import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-video-quality-selector',
  templateUrl: './video-quality-selector.component.html',
  styleUrls: ['./video-quality-selector.component.scss']
})
export class VideoQualitySelectorComponent {
  @Input() currentQuality: string = '720p';
  @Input() availableQualities: string[] = ['1080p', '720p', '480p', '360p'];
  @Output() qualityChange = new EventEmitter<string>();

  isOpen = false;

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  selectQuality(quality: string) {
    this.currentQuality = quality;
    this.qualityChange.emit(quality);
    this.isOpen = false;
  }

  closeDropdown() {
    this.isOpen = false;
  }
}
