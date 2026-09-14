import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { ApiService, Employee } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-apply-leave',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './apply-leave.html',
  styleUrl: './apply-leave.css'
})
export class ApplyLeave implements OnInit {
  newName = '';
  newType = 'Casual Leave';
  newDays = 1;
  newStartDate = '';
  newEndDate = '';
  newDuration = 'Full day';
  newReason = '';
  formError = '';
  employees: Employee[] = [];

  minDate = '';
  maxDate = '';

  leaveTypes = [
    'Casual Leave',
    'Sick Leave',
    'Paid Time Off (PTO)',
    'Maternity / Paternity Leave'
  ];

  constructor(public auth: AuthService, private api: ApiService, private router: Router) {}

  get isEmployee(): boolean { return this.auth.role === 'Employee'; }

  ngOnInit(): void {
    const today = new Date();
    this.minDate = this.formatDate(today);

    // Max date is 2 months (60 days) from today
    const max = new Date(today);
    max.setDate(max.getDate() + 60);
    this.maxDate = this.formatDate(max);

    // Default start and end dates to today
    this.newStartDate = this.minDate;
    this.newEndDate = this.minDate;
    this.calculateDays();

    if (this.isEmployee) {
      this.newName = this.auth.user?.employeeName || this.auth.user?.name || '';
    }
    this.api.employees$.subscribe(emps => {
      this.employees = (emps || []).filter(e => e.role && e.role.toLowerCase() !== 'admin');
      if (!this.newName && this.employees.length > 0) {
        this.newName = this.employees[0].name;
      }
    });
    this.api.loadEmployees().subscribe();
  }

  private formatDate(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }

  onStartDateChange(): void {
    if (!this.newStartDate) return;
    if (this.newStartDate < this.minDate) {
      this.newStartDate = this.minDate;
    }
    if (this.newStartDate > this.maxDate) {
      this.newStartDate = this.maxDate;
    }
    if (!this.newEndDate || this.newEndDate < this.newStartDate) {
      this.newEndDate = this.newStartDate;
    }
    this.calculateDays();
  }

  onEndDateChange(): void {
    if (!this.newEndDate) return;
    if (this.newEndDate < this.newStartDate) {
      this.newEndDate = this.newStartDate;
    }
    if (this.newEndDate > this.maxDate) {
      this.newEndDate = this.maxDate;
    }
    this.calculateDays();
  }

  calculateDays(): void {
    if (this.newStartDate && this.newEndDate) {
      const start = new Date(this.newStartDate + 'T00:00:00');
      const end = new Date(this.newEndDate + 'T00:00:00');
      if (end >= start) {
        const diffTime = end.getTime() - start.getTime();
        this.newDays = Math.max(1, Math.round(diffTime / (1000 * 3600 * 24)) + 1);
      } else {
        this.newDays = 1;
      }
    } else {
      this.newDays = 1;
    }

    if (this.newDays > 1) {
      this.newDuration = 'Full day';
    }
  }

  submitLeave(): void {
    this.formError = '';
    const name = this.newName.trim();
    if (!name) { this.formError = 'Select employee name.'; return; }
    if (!this.newStartDate) { this.formError = 'Select start date.'; return; }
    if (!this.newEndDate) { this.newEndDate = this.newStartDate; }

    if (this.newStartDate < this.minDate) {
      this.formError = 'Past dates cannot be selected.';
      return;
    }
    if (this.newStartDate > this.maxDate || this.newEndDate > this.maxDate) {
      this.formError = 'Leave dates must be within 2 months from today.';
      return;
    }

    const saved = JSON.parse(localStorage.getItem('synaptech-leave-requests') || '[]') as any[];
    saved.unshift({
      id: 'leave-' + Date.now(),
      name,
      type: this.newType,
      dates: this.newDays === 1 ? this.newStartDate : `${this.newStartDate} to ${this.newEndDate}`,
      startDate: this.newStartDate,
      endDate: this.newEndDate,
      days: this.newDays,
      duration: this.newDuration,
      reason: this.newReason.trim(),
      status: 'Pending',
      initials: name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    });

    localStorage.setItem('synaptech-leave-requests', JSON.stringify(saved));
    this.router.navigate(['/my-leave']);
  }
}
