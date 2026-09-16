import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, LeaveRequest } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-leave-reports',
  standalone: true,
  imports: [CommonModule, ErpPage],
  templateUrl: './leave-reports.html',
  styleUrl: './leave-reports.css'
})
export class LeaveReports implements OnInit {
  totalApprovedDays = 0;
  casualDays = 0;
  sickDays = 0;
  avgLeavePerEmp = '0';
  loading = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loading = true;
    this.api.getLeaveRequests().subscribe({
      next: (requests) => {
        const approved = (requests || []).filter(r => r.status === 'Approved');
        this.totalApprovedDays = approved.reduce((sum, r) => sum + (r.totalDays || 1), 0);
        this.casualDays = approved.filter(r => (r.leaveType || '').toLowerCase().includes('casual')).reduce((sum, r) => sum + (r.totalDays || 1), 0);
        this.sickDays = approved.filter(r => (r.leaveType || '').toLowerCase().includes('sick')).reduce((sum, r) => sum + (r.totalDays || 1), 0);

        const uniqueEmpCount = new Set(approved.map(r => r.employeeId)).size || 1;
        this.avgLeavePerEmp = (this.totalApprovedDays / uniqueEmpCount).toFixed(1);
        this.loading = false;
      },
      error: () => {
        this.totalApprovedDays = 0;
        this.casualDays = 0;
        this.sickDays = 0;
        this.avgLeavePerEmp = '0';
        this.loading = false;
      }
    });
  }
}
