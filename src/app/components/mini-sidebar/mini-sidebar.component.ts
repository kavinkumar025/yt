import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-mini-sidebar',
  templateUrl: './mini-sidebar.component.html',
  styleUrls: ['./mini-sidebar.component.scss']
})
export class MiniSidebarComponent implements OnInit {
  activeRoute: string = '/';

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.activeRoute = this.router.url;
  }

  isRouteActive(route: string): boolean {
    return this.activeRoute === route;
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
    this.activeRoute = route;
  }
}
