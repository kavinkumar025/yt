import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-category-filters',
  templateUrl: './category-filters.component.html',
  styleUrls: ['./category-filters.component.scss']
})
export class CategoryFiltersComponent {
  @Input() categories: Category[] = [];
  @Input() selectedCategory: string = 'All';
  @Output() categorySelected = new EventEmitter<string>();

  defaultCategories: Category[] = [
    { id: 'all', name: 'All' },
    { id: 'music', name: 'Music' },
    { id: 'movies', name: 'Movies' },
    { id: 'gaming', name: 'Gaming' },
    { id: 'news', name: 'News' },
    { id: 'learning', name: 'Learning' },
    { id: 'live', name: 'Live' },
    { id: 'sports', name: 'Sports' },
    { id: 'fashion', name: 'Fashion & Beauty' },
    { id: 'podcasts', name: 'Podcasts' }
  ];

  constructor() { }

  get displayCategories(): Category[] {
    return this.categories.length > 0 ? this.categories : this.defaultCategories;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.categorySelected.emit(category);
  }
}