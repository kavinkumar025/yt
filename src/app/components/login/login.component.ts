import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  registerForm: FormGroup;
  isLoginMode = true;
  loading = false;
  hidePassword = true;
  backgroundImages = [
    'assets/backgrounds/login-bg-1.jpg',
    'assets/backgrounds/login-bg-2.jpg',
    'assets/backgrounds/login-bg-3.jpg',
    'assets/backgrounds/login-bg-4.jpg',
    'assets/backgrounds/login-bg-5.jpg'
  ];
  currentBackgroundImage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    public themeService: ThemeService
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registerForm = this.formBuilder.group({
      displayName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.checkPasswords });
  }

  ngOnInit(): void {
    // Set random background image
    this.changeBackgroundImage();
    
    // Change background image every 10 seconds
    setInterval(() => {
      this.changeBackgroundImage();
    }, 10000);
  }

  changeBackgroundImage(): void {
    const randomIndex = Math.floor(Math.random() * this.backgroundImages.length);
    this.currentBackgroundImage = this.backgroundImages[randomIndex];
  }

  checkPasswords(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { notMatching: true };
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
  }

  onSubmit(): void {
    if (this.isLoginMode) {
      if (this.loginForm.valid) {
        this.login();
      }
    } else {
      if (this.registerForm.valid) {
        this.register();
      }
    }
  }

  login(): void {
    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.signInWithEmail(email, password)
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(this.getErrorMessage(error), 'Close', {
            duration: 5000
          });
        }
      });
  }

  register(): void {
    this.loading = true;
    const { email, password, displayName } = this.registerForm.value;

    this.authService.register(email, password, displayName)
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(this.getErrorMessage(error), 'Close', {
            duration: 5000
          });
        }
      });
  }

  signInWithGoogle(): void {
    this.loading = true;

    this.authService.signInWithGoogle()
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/']);
        },
        error: (error) => {
          this.loading = false;
          this.snackBar.open(this.getErrorMessage(error), 'Close', {
            duration: 5000
          });
        }
      });
  }

  private getErrorMessage(error: any): string {
    const errorCode = error.code;
    switch (errorCode) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'Email is already in use.';
      case 'auth/weak-password':
        return 'Password is too weak.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/popup-closed-by-user':
        return 'Sign in was cancelled.';
      default:
        return error.message || 'An unknown error occurred.';
    }
  }
}