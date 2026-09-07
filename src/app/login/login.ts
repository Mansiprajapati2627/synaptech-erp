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

  constructor(private router: Router, private auth: AuthService) {}

  login() {
    if (!this.auth.login(this.email, this.password)) {
      this.errorMessage = 'Invalid email or password';
      return;
    }
    this.router.navigate(['/dashboard']);
  }

}