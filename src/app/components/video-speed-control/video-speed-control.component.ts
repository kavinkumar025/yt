import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-video-speed-control',
  templateUrl: './video-speed-control.component.html',
  styleUrls: ['./video-speed-control.component.scss']
})
export class VideoSpeedControlComponent {
  @Input() currentSpeed: number = 1;
  @Input() availableSpeeds: number[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  @Output() speedChange = new EventEmitter<number>();

  isOpen = false;

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  selectSpeed(speed: number) {
    this.currentSpeed = speed;
    this.speedChange.emit(speed);
    this.isOpen = false;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  getSpeedLabel(speed: number): string {
    return speed === 1 ? 'Normal' : `${speed}x`;
  }
}
