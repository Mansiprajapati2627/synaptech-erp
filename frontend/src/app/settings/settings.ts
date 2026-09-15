import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { ErpPage } from '../shared/erp-page/erp-page';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  styleUrl: './settings.css',
  templateUrl: './settings.html',
})
export class Settings implements OnInit {
  private readonly storageKey = 'synaptech-company-settings';

  fullName = 'Mansi Prajapati';
  email = 'mansi@synaptech.io';
  phone = '+91 98765 43210';
  jobTitle = 'Senior Product Manager';

  companyName = 'Synaptech Infotech Pvt Ltd';
  companyEmail = 'hello@synaptech.io';
  taxId = 'GSTIN27AABCU9603R1ZM';
  headquarters = 'SG Highway, Bodakdev, Ahmedabad, Gujarat';

  timezone = 'UTC+05:30 (Asia/Kolkata)';
  currency = 'INR (₹)';
  workWeek = 'Monday - Friday';

  emailNotifications = true;
  weeklySummary = true;
  compactMode = false;
  savedMessage = '';

  constructor(public auth: AuthService) {}

  get currentUser() { return this.auth.user; }
  get isAdmin(): boolean { return this.currentUser?.role === 'Admin' || this.currentUser?.role === 'HR'; }

  ngOnInit(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      try {
        Object.assign(this, JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }

  saveSettings(): void {
    localStorage.setItem(this.storageKey, JSON.stringify({
      fullName: this.fullName,
      email: this.email,
      phone: this.phone,
      jobTitle: this.jobTitle,
      companyName: this.companyName,
      companyEmail: this.companyEmail,
      taxId: this.taxId,
      headquarters: this.headquarters,
      timezone: this.timezone,
      currency: this.currency,
      workWeek: this.workWeek,
      emailNotifications: this.emailNotifications,
      weeklySummary: this.weeklySummary,
      compactMode: this.compactMode
    }));
    this.savedMessage = 'Settings saved successfully!';
    window.setTimeout(() => this.savedMessage = '', 3000);
  }
}

