import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss']
})
export class SearchBarComponent {
  @Output() searchEvent = new EventEmitter<string>();
  @Input() placeholder = 'Search videos...';
  @Input() isExpanded = false;
  
  searchTerm = '';

  onSearch(): void {
    if (this.searchTerm.trim()) {
      this.searchEvent.emit(this.searchTerm.trim());
    }
  }

  onKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSearch();
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchEvent.emit('');
  }
}
