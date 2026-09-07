import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  imports: [FormsModule],
  selector: 'app-settings',
  styleUrl: './settings.css',
  templateUrl: './settings.html',
})
export class Settings {
  private readonly storageKey = 'synaptech-settings';
  fullName = 'Mansi Prajapati';
  email = 'mansi@synaptech.io';
  companyName = 'Synaptech Infotech';
  companyEmail = 'hello@synaptech.io';
  emailNotifications = true;
  weeklySummary = true;
  compactMode = false;
  savedMessage = '';

  constructor(public auth: AuthService) {}

  get currentUser() { return this.auth.user; }
  get isAdmin(): boolean { return this.currentUser?.role === 'Admin'; }
  logout(): void { this.auth.logout(); }

  ngOnInit(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) Object.assign(this, JSON.parse(saved));
  }

  saveSettings(): void {
    localStorage.setItem(this.storageKey, JSON.stringify({
      fullName: this.fullName,
      email: this.email,
      companyName: this.companyName,
      companyEmail: this.companyEmail,
      emailNotifications: this.emailNotifications,
      weeklySummary: this.weeklySummary,
      compactMode: this.compactMode
    }));
    this.savedMessage = 'Settings saved';
    window.setTimeout(() => this.savedMessage = '', 2500);
  }
}
