import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  templateUrl: './loading-skeleton.component.html',
  styleUrls: ['./loading-skeleton.component.scss']
})
export class LoadingSkeletonComponent {
  @Input() type: 'video' | 'document' = 'video';
  @Input() count: number = 4;
  @Input() layout: 'grid' | 'horizontal' = 'grid';

  constructor() { }

  // Create an array of the specified count for ngFor
  get items(): number[] {
    return Array(this.count).fill(0).map((_, i) => i);
  }
}
