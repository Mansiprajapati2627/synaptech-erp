import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { ApiService, AttendanceRecord as ApiAttendanceRecord } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './my-attendance.html',
  styleUrl: './my-attendance.css'
})
export class MyAttendance implements OnInit {
  selectedDate = new Date().toISOString().slice(0, 10);
  todayRecord?: any;
  records: any[] = [];
  currentEmployeeId?: number;

  constructor(public auth: AuthService, private api: ApiService) {}

  get currentUserName(): string {
    return this.auth.user?.employeeName || this.auth.user?.name || '';
  }

  ngOnInit(): void {
    this.api.attendances$.subscribe(list => {
      this.records = list.filter(r => r.employeeName.toLowerCase() === this.currentUserName.toLowerCase());
      this.todayRecord = this.records.find(r => r.date === this.selectedDate);
    });

    this.api.loadAttendance(this.selectedDate).subscribe();
  }

  clockIn(): void {
    const currentEmp = this.api.currentEmployees.find(e => e.name.toLowerCase() === this.currentUserName.toLowerCase());
    if (currentEmp) {
      this.api.clockIn(currentEmp.id, this.selectedDate).subscribe();
    }
  }

  clockOut(): void {
    const currentEmp = this.api.currentEmployees.find(e => e.name.toLowerCase() === this.currentUserName.toLowerCase());
    if (currentEmp) {
      this.api.clockOut(currentEmp.id, this.selectedDate).subscribe();
    }
  }
}
