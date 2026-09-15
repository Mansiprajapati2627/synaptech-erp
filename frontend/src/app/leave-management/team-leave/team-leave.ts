import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  ngOnInit(): void {
    const saved = localStorage.getItem('synaptech-leave-requests');
    if (saved) {
      this.teamLeaves = JSON.parse(saved);
    } else {
      this.teamLeaves = [
        { name: 'Aarav Shah', type: 'Casual leave', dates: 'Sep 8 - Sep 9', days: 2, duration: 'Full day', status: 'Approved', initials: 'AS' },
        { name: 'Riya Shah', type: 'Sick leave', dates: 'Sep 4', days: 1, duration: 'Half day', status: 'Approved', initials: 'RS' }
      ];
    }
  }
}
