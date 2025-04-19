import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { VideoService } from '../../services/video.service';
import { DocumentService } from '../../services/document.service';
import { UserProfile } from '../../models/user.model';
import { Video } from '../../models/video.model';
import { Document } from '../../models/document.model';
import { MatDialog } from '@angular/material/dialog';
import { UploadModalComponent } from '../../components/upload-modal/upload-modal.component';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  user: UserProfile | null = null;
  userVideos: Video[] = [];
  userDocuments: Document[] = [];

  activeTab: 'videos' | 'documents' = 'videos';
  isLoadingVideos = true;
  isLoadingDocuments = true;
  bannerColor: string;

  constructor(
    public authService: AuthService,
    public videoService: VideoService,
    public documentService: DocumentService,
    public dialog: MatDialog,
    public toastr: ToastrService,
    public router: Router
  ) {
    // Generate a random color for the banner
    const hue = Math.floor(Math.random() * 360);
    this.bannerColor = `hsl(${hue}, 60%, 50%)`;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;

      if (user) {
        this.loadUserVideos(user.uid);
        this.loadUserDocuments(user.uid);
      } else {
        this.router.navigate(['/']);
      }
    });
  }

  loadUserVideos(userId: string): void {
    this.isLoadingVideos = true;
    this.videoService.getUserVideos(userId).subscribe({
      next: (videos) => {
        this.userVideos = videos;
        this.isLoadingVideos = false;
      },
      error: (error) => {
        console.error('Error loading user videos:', error);
        this.isLoadingVideos = false;
      }
    });
  }

  loadUserDocuments(userId: string): void {
    this.isLoadingDocuments = true;
    this.documentService.getUserDocuments(userId).subscribe({
      next: (documents) => {
        this.userDocuments = documents;
        this.isLoadingDocuments = false;
      },
      error: (error) => {
        console.error('Error loading user documents:', error);
        this.isLoadingDocuments = false;
      }
    });
  }

  setActiveTab(tab: 'videos' | 'documents'): void {
    this.activeTab = tab;
  }

  openUploadModal(): void {
    const dialogRef = this.dialog.open(UploadModalComponent, {
      width: '600px',
      panelClass: this.isDarkTheme ? 'dark-theme-dialog' : 'light-theme-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Reload the content when upload is successful
        if (this.user) {
          this.loadUserVideos(this.user.uid);
          this.loadUserDocuments(this.user.uid);
        }
      }
    });
  }

  deleteVideo(video: Video, event: Event): void {
    event.stopPropagation();

    if (confirm('Are you sure you want to delete this video?')) {
      this.videoService.deleteVideo(video.id).subscribe({
        next: () => {
          this.toastr.success('Video deleted successfully');
          this.userVideos = this.userVideos.filter(v => v.id !== video.id);
        },
        error: (error) => {
          console.error('Error deleting video:', error);
          this.toastr.error('Error deleting video. Please try again.');
        }
      });
    }
  }

  deleteDocument(document: Document, event: Event): void {
    event.stopPropagation();

    if (confirm('Are you sure you want to delete this document?')) {
      this.documentService.deleteDocument(document.id).subscribe({
        next: () => {
          this.toastr.success('Document deleted successfully');
          this.userDocuments = this.userDocuments.filter(d => d.id !== document.id);
        },
        error: (error) => {
          console.error('Error deleting document:', error);
          this.toastr.error('Error deleting document. Please try again.');
        }
      });
    }
  }

  formatSubscribers(count: number): string {
    if (count >= 1_000_000) {
      return (count / 1_000_000).toFixed(1) + 'M';
    }
    if (count >= 1_000) {
      return (count / 1_000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  get isDarkTheme(): boolean {
    return document.documentElement.classList.contains('dark-theme');
  }
}
