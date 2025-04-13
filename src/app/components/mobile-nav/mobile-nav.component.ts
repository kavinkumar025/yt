import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mobile-nav',
  templateUrl: './mobile-nav.component.html',
  styleUrls: ['./mobile-nav.component.scss']
})
export class MobileNavComponent {
  @Output() openUploadModal = new EventEmitter<void>();
  
  activeRoute: string = '/';

  constructor(private router: Router) {
    this.activeRoute = this.router.url;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.activeRoute = route;
  }

  onCreateClick(): void {
    this.openUploadModal.emit();
  }

  isRouteActive(route: string): boolean {
    return this.activeRoute === route;
  }
}
