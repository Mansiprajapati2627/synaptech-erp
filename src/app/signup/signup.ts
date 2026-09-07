import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.html',
  styleUrl: './signup.css',
  imports: [FormsModule]
})
export class Signup {
  name = 'Mansi';
  email = 'mansiprajapati2627@gmail.com';
  password = '';
  confirmPassword = '';

  signup() {
    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    alert('Account created successfully!');
  }
}