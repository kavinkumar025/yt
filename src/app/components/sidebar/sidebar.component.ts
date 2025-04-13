import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { UserProfile } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: false

})
export class SidebarComponent implements OnInit {
  @Input() expanded = true;
  @Output() openLogin = new EventEmitter<void>();
  
  user$: Observable<UserProfile | null>;
  subscribedChannels$: Observable<UserProfile[]>;
  
  constructor(private authService: AuthService) {}
  
  ngOnInit(): void {
    this.user$ = this.authService.currentUser$;
    this.subscribedChannels$ = this.authService.getSubscribedChannels();
  }
  
  onSignIn(): void {
    this.openLogin.emit();
  }
}