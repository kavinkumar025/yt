import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit {
  constructor(private toastrService: ToastrService) { }

  ngOnInit(): void {
    // Configure default toastr settings
    this.toastrService.toastrConfig.positionClass = 'toast-bottom-right';
    this.toastrService.toastrConfig.timeOut = 3000;
    this.toastrService.toastrConfig.closeButton = true;
    this.toastrService.toastrConfig.progressBar = true;
    this.toastrService.toastrConfig.preventDuplicates = true;
  }
}
