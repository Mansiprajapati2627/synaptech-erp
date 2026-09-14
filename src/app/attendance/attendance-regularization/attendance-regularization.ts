import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

interface RegReq { id: string; employeeName: string; date: string; reason: string; type: string; status: 'Pending' | 'Approved' | 'Declined'; }

@Component({
  selector: 'app-attendance-regularization',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './attendance-regularization.html',
  styleUrl: './attendance-regularization.css'
})
export class AttendanceRegularization {
  requests: RegReq[] = [
    { id: 'reg-1', employeeName: 'Aarav Shah', date: '2026-09-10', reason: 'Forgot check-in due to early client meeting', type: 'Missing Punch', status: 'Pending' },
    { id: 'reg-2', employeeName: 'Riya Shah', date: '2026-09-11', reason: 'Highway traffic delay', type: 'Late Arrival', status: 'Approved' }
  ];

  newRegDate = new Date().toISOString().slice(0, 10);
  newRegReason = '';
  newRegType = 'Missing Punch';
  successMsg = '';

  constructor(public auth: AuthService) {}

  get canReview(): boolean {
    return this.auth.hasRole(['Admin', 'HR', 'Manager']);
  }

  submitRequest(): void {
    if (!this.newRegReason.trim()) return;
    this.requests.unshift({
      id: 'reg-' + Date.now(),
      employeeName: this.auth.user?.name || 'Employee',
      date: this.newRegDate,
      reason: this.newRegReason.trim(),
      type: this.newRegType,
      status: 'Pending'
    });
    this.newRegReason = '';
    this.successMsg = 'Request submitted successfully!';
    setTimeout(() => this.successMsg = '', 3000);
  }

  updateStatus(req: RegReq, status: 'Approved' | 'Declined'): void {
    req.status = status;
  }
}
