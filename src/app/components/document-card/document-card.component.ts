import { Component, Input, OnInit } from '@angular/core';
import { Document } from '../../models/document.model';
import { formatDistanceToNow } from 'date-fns';
import { DocumentService } from '../../services/document.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-document-card',
  templateUrl: './document-card.component.html',
  styleUrls: ['./document-card.component.scss']
})
export class DocumentCardComponent implements OnInit {
  @Input() document: Document;
  
  timeAgo: string;
  fileIcon: string;

  constructor(
    private documentService: DocumentService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.formatTimeAgo();
    this.setFileIcon();
  }

  formatTimeAgo(): void {
    if (this.document && this.document.createdAt) {
      this.timeAgo = formatDistanceToNow(this.document.createdAt, { addSuffix: true });
    }
  }

  formatViews(views: number): string {
    if (views >= 1_000_000) {
      return (views / 1_000_000).toFixed(1) + 'M';
    }
    if (views >= 1_000) {
      return (views / 1_000).toFixed(1) + 'K';
    }
    return views.toString();
  }

  setFileIcon(): void {
    const fileType = this.document.fileType;
    if (fileType.includes('pdf')) {
      this.fileIcon = 'picture_as_pdf';
    } else if (fileType.includes('word') || fileType.includes('document')) {
      this.fileIcon = 'description';
    } else if (fileType.includes('excel') || fileType.includes('sheet')) {
      this.fileIcon = 'table_chart';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      this.fileIcon = 'slideshow';
    } else if (fileType.includes('image')) {
      this.fileIcon = 'image';
    } else if (fileType.includes('audio')) {
      this.fileIcon = 'audiotrack';
    } else if (fileType.includes('video')) {
      this.fileIcon = 'videocam';
    } else {
      this.fileIcon = 'insert_drive_file';
    }
  }

  downloadDocument(event: Event): void {
    event.stopPropagation();
    this.documentService.incrementDownloadCount(this.document.id).subscribe({
      next: () => {
        // Create a temporary link and click it to download
        const link = document.createElement('a');
        link.href = this.document.fileURL;
        link.download = this.document.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.toastr.success('Document download started');
      },
      error: (error) => {
        this.toastr.error('Error downloading document: ' + error.message);
      }
    });
  }

  viewDocument(): void {
    window.open(this.document.fileURL, '_blank');
  }
}
