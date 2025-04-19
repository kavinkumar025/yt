import { Component, OnInit, EventEmitter, Output, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserProfile } from '../../models/user.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();
  @Output() openLogin = new EventEmitter<void>();
  @Output() openUpload = new EventEmitter<void>();

  searchFocused = false;
  mobileSearchOpen = false;
  searchQuery = '';
  userMenuOpen = false;

  user$: Observable<UserProfile | null>;

  constructor(
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.user$ = this.authService.currentUser$;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close user menu when clicking outside
    const userMenuElement = document.querySelector('.user-menu');
    const userAvatarElement = document.querySelector('.user-avatar');
    if (this.userMenuOpen && userMenuElement && userAvatarElement) {
      if (!userMenuElement.contains(event.target as Node) &&
        !userAvatarElement.contains(event.target as Node)) {
        this.userMenuOpen = false;
      }
    }
  }

  onSearchFocus(): void {
    this.searchFocused = true;
  }

  onSearchBlur(): void {
    this.searchFocused = false;
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchQuery.trim() }
      });
      this.mobileSearchOpen = false;
    }
  }

  toggleMobileSearch(): void {
    this.mobileSearchOpen = !this.mobileSearchOpen;
    if (this.mobileSearchOpen) {
      setTimeout(() => {
        const mobileSearchInput = document.querySelector('.mobile-search input');
        if (mobileSearchInput) {
          (mobileSearchInput as HTMLInputElement).focus();
        }
      }, 100);
    }
  }

  closeMobileSearch(): void {
    this.mobileSearchOpen = false;
  }

  onMenuClick(): void {
    this.menuToggle.emit();
  }

  onSignIn(): void {
    this.openLogin.emit();
  }

  onUpload(): void {
    this.openUpload.emit();
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  public onSignOut(): void {
    this.authService.signOut().subscribe();
    this.userMenuOpen = false;
  }
}