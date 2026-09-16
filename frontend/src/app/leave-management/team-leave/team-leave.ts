import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-team-leave',
  standalone: true,
  imports: [CommonModule, ErpPage],
  templateUrl: './team-leave.html',
  styleUrl: './team-leave.css'
})
export class TeamLeave implements OnInit {
  teamLeaves: any[] = [];
  loading = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loading = true;
    this.api.getLeaveRequests().subscribe({
      next: (data) => {
        this.teamLeaves = (data || []).map(r => ({
          id: r.id,
          name: r.employeeName || `Employee #${r.employeeId}`,
          type: r.leaveType,
          dates: r.startDate === r.endDate ? r.startDate : `${r.startDate} to ${r.endDate}`,
          days: r.totalDays,
          duration: 'Full day',
          status: r.status,
          initials: (r.employeeName || 'EMP').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
        }));
        this.loading = false;
      },
      error: () => {
        this.teamLeaves = [];
        this.loading = false;
      }
    });
  }
}
