import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-floating-action-button',
  templateUrl: './floating-action-button.component.html',
  styleUrls: ['./floating-action-button.component.scss']
})
export class FloatingActionButtonComponent {
  @Input() actions: Array<{icon: string, label: string, color?: string}> = [];
  @Output() actionClick = new EventEmitter<string>();

  isExpanded = false;

  toggleMenu() {
    this.isExpanded = !this.isExpanded;
  }

  onActionClick(action: string) {
    this.actionClick.emit(action);
    this.isExpanded = false;
  }
}
