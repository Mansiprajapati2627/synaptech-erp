import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
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

  constructor(public auth: AuthService) {}

  get canReview(): boolean {
    return this.auth.hasRole(['Admin', 'HR']);
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    const saved = localStorage.getItem('synaptech-leave-requests');
    if (saved) {
      this.requests = JSON.parse(saved);
    } else {
      this.requests = [
        { name: 'Aarav Shah', type: 'Casual leave', dates: 'Sep 8 - Sep 9', days: 2, duration: 'Full day', reason: 'Personal work', status: 'Pending', initials: 'AS' },
        { name: 'Riya Shah', type: 'Sick leave', dates: 'Sep 4', days: 1, duration: 'Half day', reason: 'Medical appointment', status: 'Approved', initials: 'RS' }
      ];
    }
  }

  updateStatus(req: any, status: 'Approved' | 'Declined'): void {
    if (!this.canReview) return;
    req.status = status;
    localStorage.setItem('synaptech-leave-requests', JSON.stringify(this.requests));
  }
}
