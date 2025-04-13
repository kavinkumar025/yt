import { Component, OnInit, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { UploadModalComponent } from './components/upload-modal/upload-modal.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})

export class AppComponent implements OnInit {
  isSidebarExpanded = true;
  isMobileView = false;
  isMobileSidebarOpen = false;

  constructor(
    public themeService: ThemeService,
    private dialog: MatDialog,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
  }

  checkScreenSize(): void {
    this.isMobileView = window.innerWidth <= 768;
    
    // Auto-collapse sidebar on smaller screens
    if (window.innerWidth <= 1200 && !this.isMobileView) {
      this.isSidebarExpanded = false;
    }
  }

  toggleSidebar(): void {
    if (this.isMobileView) {
      this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
    } else {
      this.isSidebarExpanded = !this.isSidebarExpanded;
    }
  }

  openLoginModal(): void {
    // This will be implemented with a login dialog component later
    // For now, directly use the Google sign-in method
    this.authService.signInWithGoogle().subscribe();
  }

  openUploadModal(): void {
    // This will be implemented with an upload dialog component later
    // For now, just log that upload was clicked
    console.log('Upload clicked');
    this.dialog.open(UploadModalComponent, {
      width: '800px'
    });
  }

  closeMobileSidebar(): void {
    this.isMobileSidebarOpen = false;
  }
}