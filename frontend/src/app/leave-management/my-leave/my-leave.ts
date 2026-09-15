import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth.service';
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

  constructor(public auth: AuthService) {}

  get currentUserName(): string {
    return this.auth.user?.employeeName || this.auth.user?.name || '';
  }

  ngOnInit(): void {
    const saved = localStorage.getItem('synaptech-leave-requests');
    if (saved) {
      const all = JSON.parse(saved) as any[];
      this.requests = all.filter(r => r.name === this.currentUserName);
    }
  }

  get usedLeaves(): number {
    return this.requests.filter(r => r.status !== 'Declined').reduce((sum, r) => sum + (r.days || 1), 0);
  }

  get remainingLeaves(): number {
    return Math.max(0, this.availableLeaves - this.usedLeaves);
  }
}
