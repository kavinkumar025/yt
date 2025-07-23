import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-floating-player',
  templateUrl: './floating-player.component.html',
  styleUrls: ['./floating-player.component.scss']
})
export class FloatingPlayerComponent {
  @Input() videoUrl: string;
  @Input() title: string;
  @Input() isVisible: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() expand = new EventEmitter<void>();

  isDragging = false;
  position = { x: 20, y: 20 };
  dragOffset = { x: 0, y: 0 };

  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.dragOffset = {
      x: event.clientX - this.position.x,
      y: event.clientY - this.position.y
    };
    
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      this.position = {
        x: Math.max(0, Math.min(window.innerWidth - 320, event.clientX - this.dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 200, event.clientY - this.dragOffset.y))
      };
    }
  }

  onMouseUp() {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
  }

  onClose() {
    this.close.emit();
  }

  onExpand() {
    this.expand.emit();
  }

  get playerStyle() {
    return {
      transform: `translate(${this.position.x}px, ${this.position.y}px)`,
      cursor: this.isDragging ? 'grabbing' : 'grab'
    };
  }
}
