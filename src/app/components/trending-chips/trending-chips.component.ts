import { Component, EventEmitter, Output, Input } from '@angular/core';

@Component({
  selector: 'app-trending-chips',
  templateUrl: './trending-chips.component.html',
  styleUrls: ['./trending-chips.component.scss']
})
export class TrendingChipsComponent {
  @Output() categorySelected = new EventEmitter<string>();
  @Input() selectedCategory = 'All';
  
  categories = [
    { label: 'All', value: 'all' },
    { label: 'Music', value: 'music' },
    { label: 'Gaming', value: 'gaming' },
    { label: 'Movies', value: 'movies' },
    { label: 'Tech', value: 'tech' },
    { label: 'Sports', value: 'sports' },
    { label: 'Comedy', value: 'comedy' },
    { label: 'Education', value: 'education' },
    { label: 'News', value: 'news' },
    { label: 'Vlogs', value: 'vlogs' },
    { label: 'Travel', value: 'travel' },
    { label: 'Food', value: 'food' }
  ];

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.categorySelected.emit(category);
  }
}
