import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, AttendanceRecord } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-team-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './team-attendance.html',
  styleUrl: './team-attendance.css'
})
export class TeamAttendance implements OnInit {
  selectedDate = new Date().toISOString().slice(0, 10);
  records: AttendanceRecord[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.attendances$.subscribe(list => {
      this.records = list;
    });
    this.api.loadAttendance(this.selectedDate).subscribe();
  }

  onDateChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) {
      this.selectedDate = val;
      this.api.loadAttendance(this.selectedDate).subscribe();
    }
  }
}
