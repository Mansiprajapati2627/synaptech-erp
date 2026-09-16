import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
import { ApiService, LeaveRequest } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-my-leave',
  standalone: true,
  imports: [CommonModule, ErpPage],
  templateUrl: './my-leave.html',
  styleUrl: './my-leave.css'
})
export class MyLeave implements OnInit {
  requests: any[] = [];
  readonly availableLeaves = 12;
  loading = false;

  constructor(public auth: AuthService, private api: ApiService) {}

  get currentUserName(): string {
    return this.auth.user?.employeeName || this.auth.user?.name || '';
  }

  get currentEmployeeId(): number {
    return (this.auth.user as any)?.employeeId || 0;
  }

  ngOnInit(): void {
    this.loadMyLeaves();
  }

  loadMyLeaves(): void {
    this.loading = true;
    this.api.getLeaveRequests().subscribe({
      next: (data) => {
        const empId = this.currentEmployeeId;
        const name = this.currentUserName.toLowerCase();

        this.requests = (data || [])
          .filter(r => (empId && r.employeeId === empId) || (r.employeeName && r.employeeName.toLowerCase() === name))
          .map(r => ({
            id: r.id,
            name: r.employeeName || this.currentUserName,
            type: r.leaveType,
            dates: r.startDate === r.endDate ? r.startDate : `${r.startDate} to ${r.endDate}`,
            days: r.totalDays,
            duration: 'Full day',
            reason: r.reason,
            status: r.status,
            initials: (r.employeeName || 'ME').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
          }));
        this.loading = false;
      },
      error: () => {
        this.requests = [];
        this.loading = false;
      }
    });
  }

  get usedLeaves(): number {
    return this.requests.filter(r => r.status !== 'Rejected' && r.status !== 'Declined').reduce((sum, r) => sum + (r.days || 1), 0);
  }

  get remainingLeaves(): number {
    return Math.max(0, this.availableLeaves - this.usedLeaves);
  }
}
