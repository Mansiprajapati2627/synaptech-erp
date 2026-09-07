import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

interface LeaveRequest { name: string; type: string; dates: string; startDate: string; endDate: string; days: number; duration: 'Full day' | 'Half day' | 'Partial day'; reason: string; status: 'Pending' | 'Approved' | 'Declined'; initials: string; }

@Component({
  imports: [FormsModule],
  selector: 'app-leave-management',
  styleUrl: './leave-management.css',
  templateUrl: './leave-management.html',
})
export class LeaveManagement {
  private readonly storageKey = 'synaptech-leave-requests';
  showForm = false;
  newName = '';
  newType = 'Casual leave';
  newDates = '';
  newReason = '';
  newDays = 1;
  newStartDate = '';
  newEndDate = '';
  newDuration: LeaveRequest['duration'] = 'Full day';
  formError = '';
  readonly availableLeaves = 12;
  requests: LeaveRequest[] = [
    { name: 'Aarav Shah', type: 'Casual leave', dates: 'Sep 8 - Sep 9', startDate: '2026-09-08', endDate: '2026-09-09', days: 2, duration: 'Full day', reason: 'Personal work', status: 'Pending', initials: 'AS' },
    { name: 'Riya Shah', type: 'Sick leave', dates: 'Sep 4', startDate: '2026-09-04', endDate: '2026-09-04', days: 1, duration: 'Half day', reason: 'Medical appointment', status: 'Approved', initials: 'RS' }
  ];

  constructor(public auth: AuthService) {}
  logout(): void { this.auth.logout(); }
  ngOnInit(): void {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.requests = (JSON.parse(saved) as Partial<LeaveRequest>[]).map(request => ({
        ...request,
        startDate: request.startDate ?? '',
        endDate: request.endDate ?? request.startDate ?? '',
        days: request.days ?? 1,
        duration: request.duration ?? 'Full day',
        dates: request.dates ?? '',
        reason: request.reason ?? '',
        status: request.status ?? 'Pending',
        initials: request.initials ?? request.name?.slice(0, 2).toUpperCase() ?? ''
      })) as LeaveRequest[];
    }
  }
  get isEmployee(): boolean { return this.auth.role === 'Employee'; }
  get canReview(): boolean { return this.auth.hasRole(['Admin', 'HR']); }
  get currentUserName(): string { return this.auth.user?.employeeName ?? ''; }
  get minimumLeaveDate(): string { return this.toDateInputValue(new Date()); }
  get maximumLeaveDate(): string {
    const maximumDate = new Date();
    maximumDate.setMonth(maximumDate.getMonth() + 2);
    return this.toDateInputValue(maximumDate);
  }
  get visibleRequests(): LeaveRequest[] { return this.isEmployee ? this.requests.filter(request => request.name === this.auth.user?.employeeName) : this.requests; }
  get pendingCount(): number { return this.visibleRequests.filter(request => request.status === 'Pending').length; }
  get usedLeaves(): number { return this.visibleRequests.filter(request => request.status !== 'Declined').reduce((total, request) => total + request.days, 0); }
  get remainingLeaves(): number { return Math.max(0, this.availableLeaves - this.usedLeaves); }
  toggleForm(): void { this.showForm = !this.showForm; if (this.isEmployee) this.newName = this.currentUserName; }
  updateStatus(request: LeaveRequest, status: 'Approved' | 'Declined'): void { if (!this.canReview) return; request.status = status; this.save(); }
  addRequest(): void {
    this.formError = '';
    const name = this.newName.trim();
    const days = Number(this.newDays);
    if (!name) { this.formError = 'Select an employee.'; return; }
    if (!this.newStartDate) { this.formError = 'Select a start date from the calendar.'; return; }
    if (!Number.isInteger(days) || days < 1) { this.formError = 'Number of days must be at least 1.'; return; }
    if (days > 1 && !this.newEndDate) { this.formError = 'Select an end date for multiple days.'; return; }
    if (days === 1) this.newEndDate = this.newStartDate;
    if (this.newEndDate < this.newStartDate) { this.formError = 'End date must be after the start date.'; return; }
    const partialMonth = this.newStartDate.slice(0, 7);
    if (this.newDuration === 'Partial day' && this.requests.some(request => request.name === name && request.duration === 'Partial day' && request.startDate.slice(0, 7) === partialMonth)) {
      this.formError = 'Only one partial day is allowed per employee each month.';
      return;
    }
    const dates = days === 1 ? this.newStartDate : `${this.newStartDate} to ${this.newEndDate}`;
    this.requests.unshift({ name, type: this.newType, dates, startDate: this.newStartDate, endDate: this.newEndDate, days, duration: this.newDuration, reason: this.newReason.trim(), status: 'Pending', initials: name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() });
    this.save(); this.newName = ''; this.newStartDate = ''; this.newEndDate = ''; this.newDays = 1; this.newDuration = 'Full day'; this.newReason = ''; this.showForm = false;
  }
  save(): void { localStorage.setItem(this.storageKey, JSON.stringify(this.requests)); }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
