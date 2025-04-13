import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login-modal',
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.scss']
})
export class LoginModalComponent implements OnInit {
  loginForm: FormGroup;
  registerForm: FormGroup;
  isLoginMode = true;
  isLoading = false;
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<LoginModalComponent>,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  toggleAuthMode(): void {
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
    this.isLoading = true;
    const { email, password } = this.loginForm.value;
    
    this.authService.signInWithEmail(email, password).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastr.success('Signed in successfully');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.isLoading = false;
        this.toastr.error(this.getErrorMessage(error));
      }
    });
  }

  register(): void {
    this.isLoading = true;
    const { displayName, email, password } = this.registerForm.value;
    
    this.authService.register(email, password, displayName).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastr.success('Account created successfully');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.isLoading = false;
        this.toastr.error(this.getErrorMessage(error));
      }
    });
  }

  signInWithGoogle(): void {
    this.isLoading = true;
    
    this.authService.signInWithGoogle().subscribe({
      next: () => {
        this.isLoading = false;
        this.toastr.success('Signed in with Google successfully');
        this.dialogRef.close(true);
      },
      error: (error) => {
        this.isLoading = false;
        this.toastr.error(this.getErrorMessage(error));
      }
    });
  }

  getErrorMessage(error: any): string {
    let message = 'An error occurred. Please try again.';
    
    if (error?.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No user found with this email address.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password. Please try again.';
          break;
        case 'auth/email-already-in-use':
          message = 'This email is already registered.';
          break;
        case 'auth/weak-password':
          message = 'Password is too weak. Use at least 6 characters.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address format.';
          break;
        case 'auth/popup-closed-by-user':
          message = 'Sign in was cancelled. Please try again.';
          break;
        default:
          message = error.message || message;
      }
    }
    
    return message;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
