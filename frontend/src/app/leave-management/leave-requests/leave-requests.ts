import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
import { ApiService, LeaveRequest } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [CommonModule, ErpPage],
  templateUrl: './leave-requests.html',
  styleUrl: './leave-requests.css'
})
export class LeaveRequests implements OnInit {
  requests: any[] = [];
  loading = false;

  constructor(public auth: AuthService, private api: ApiService) {}

  get canReview(): boolean {
    return this.auth.hasRole(['Admin', 'HR']);
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading = true;
    this.api.getLeaveRequests().subscribe({
      next: (data) => {
        this.requests = (data || []).map(r => ({
          id: r.id,
          name: r.employeeName || `Employee #${r.employeeId}`,
          type: r.leaveType,
          dates: r.startDate === r.endDate ? r.startDate : `${r.startDate} to ${r.endDate}`,
          days: r.totalDays,
          duration: 'Full day',
          reason: r.reason,
          status: r.status,
          initials: (r.employeeName || 'EMP').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
        }));
        this.loading = false;
      },
      error: () => {
        this.requests = [];
        this.loading = false;
      }
    });
  }

  updateStatus(req: any, status: 'Approved' | 'Declined'): void {
    if (!this.canReview) return;
    const reviewerName = this.auth.user?.name || this.auth.user?.employeeName || 'HR Admin';
    const apiStatus = status === 'Declined' ? 'Rejected' : 'Approved';

    this.api.updateLeaveStatus(req.id, apiStatus, reviewerName).subscribe({
      next: () => {
        req.status = apiStatus;
        this.loadRequests();
      },
      error: (err) => {
        console.error('Failed to update leave status:', err);
      }
    });
  }
}
