// src/app/login/login.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [FormsModule]
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(private router: Router, private auth: AuthService) {}

  login(): void {
    if (!this.email.trim() && !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }
    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }
    if (!this.password) {
      this.errorMessage = 'Please enter your password.';
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        console.error('Login attempt failed:', err);
        if (err?.status === 0) {
          this.errorMessage = 'Unable to connect to server. Please ensure backend is running.';
        } else if (err?.status === 401) {
          this.errorMessage = err?.error?.message || 'Invalid email or password. Please try again.';
        } else if (err?.status === 400) {
          this.errorMessage = err?.error?.message || 'Invalid login request.';
        } else {
          this.errorMessage = err?.error?.message || 'Login failed. Please verify your credentials.';
        }
      }
    });
  }
}