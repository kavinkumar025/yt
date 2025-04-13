import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { VideoService } from '../../services/video.service';
import { DocumentService } from '../../services/document.service';
import { Category } from '../../models/category.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-upload-modal',
  templateUrl: './upload-modal.component.html',
  styleUrls: ['./upload-modal.component.scss'],
  standalone: false
})
export class UploadModalComponent implements OnInit {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  thumbnailFile: File | null = null;
  isUploading = false;
  uploadProgress = 0;
  fileType: 'video' | 'document' = 'video';
  thumbnailUrl: string | null = null;
  isDropping = false;

  categories: Category[] = [
    { id: 'music', name: 'Music' },
    { id: 'gaming', name: 'Gaming' },
    { id: 'news', name: 'News' },
    { id: 'education', name: 'Education' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'sports', name: 'Sports' },
    { id: 'technology', name: 'Technology' },
    { id: 'travel', name: 'Travel' },
    { id: 'howto', name: 'How-to & Style' },
    { id: 'people', name: 'People & Blogs' },
    { id: 'comedy', name: 'Comedy' },
    { id: 'film', name: 'Film & Animation' },
    { id: 'autos', name: 'Autos & Vehicles' },
    { id: 'pets', name: 'Pets & Animals' },
    { id: 'science', name: 'Science & Technology' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UploadModalComponent>,
    private videoService: VideoService,
    private documentService: DocumentService,
    private toastr: ToastrService
  ) {
    this.uploadForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(5000)],
      category: ['', Validators.required]
    });
    // this.uploadForm = this.fb.group({
    //   title: [''],
    //   description: [''],
    //   category: ['']
    // });
  }

  ngOnInit(): void {
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.handleFile(input.files[0]);
    }
  }

  onThumbnailSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      if (file.type.startsWith('image/')) {
        this.thumbnailFile = file;
        // Create a preview
        const reader = new FileReader();
        reader.onload = () => {
          this.thumbnailUrl = reader.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        this.toastr.error('Please select an image file for the thumbnail');
      }
    }
  }

  handleFile(file: File): void {
    this.selectedFile = file;
    
    // Determine file type
    if (file.type.startsWith('video/')) {
      this.fileType = 'video';
      
      // Extract file name for default title (without extension)
      const fileName = file.name.split('.').slice(0, -1).join('.');
      this.uploadForm.patchValue({ title: fileName });
      
      // For video, we would get the duration here in a real implementation
      // This requires loading the video into a video element
      
    } else if (file.type.startsWith('application/')) {
      this.fileType = 'document';
      
      // Extract file name for default title (without extension)
      const fileName = file.name.split('.').slice(0, -1).join('.');
      this.uploadForm.patchValue({ title: fileName });
    } else {
      this.selectedFile = null;
      this.toastr.error('Unsupported file type. Please select a video or document file.');
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDropping = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDropping = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDropping = false;
    
    if (event.dataTransfer?.files.length) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.toastr.error('Please select a file to upload');
      return;
    }
    
    if (this.uploadForm.invalid) {
      this.toastr.error('Please fill all required fields');
      return;
    }
    
    this.isUploading = true;
    
    const formData = this.uploadForm.value;
    
    // If thumbnail is selected for video, upload it first
    if (this.fileType === 'video' && this.thumbnailFile) {
      this.videoService.uploadThumbnail(this.thumbnailFile).subscribe({
        next: (thumbnailUrl) => {
          this.uploadVideo(formData, thumbnailUrl);
        },
        error: (error) => {
          this.isUploading = false;
          this.toastr.error('Error uploading thumbnail: ' + error.message);
        }
      });
    } else if (this.fileType === 'video') {
      this.uploadVideo(formData);
    } else {
      this.uploadDocument(formData);
    }
  }

  uploadVideo(formData: any, thumbnailUrl?: string): void {
    const videoData = {
      title: formData?.title,
      description: formData?.description,
      category: formData?.category,
      thumbnailURL: thumbnailUrl || undefined,
      duration: '0:00' // This would be calculated from the actual video in a real implementation
    };
    
    this.videoService.uploadVideo(videoData, this.selectedFile!).subscribe({
      next: (videoId) => {
        this.isUploading = false;
        this.toastr.success('Video uploaded successfully');
        this.dialogRef.close(videoId);
      },
      error: (error) => {
        this.isUploading = false;
        this.toastr.error('Error uploading video: ' + error.message);
      }
    });
  }

  uploadDocument(formData: any): void {
    const documentData = {
      title: formData?.title,
      description: formData?.description,
      category: formData?.category
    };
    
    this.documentService.uploadDocument(documentData, this.selectedFile!).subscribe({
      next: (documentId) => {
        this.isUploading = false;
        this.toastr.success('Document uploaded successfully');
        this.dialogRef.close(documentId);
      },
      error: (error) => {
        this.isUploading = false;
        this.toastr.error('Error uploading document: ' + error.message);
      }
    });
  }

  cancelUpload(): void {
    this.dialogRef.close();
  }
}
