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
    return this.auth.user?.employeeName || this.auth.user?.name || 'Employee';
  }

  ngOnInit(): void {
    this.api.attendances$.subscribe(list => {
      this.records = list.filter(r =>
        (this.auth.user?.employeeId && r.employeeId === this.auth.user.employeeId) ||
        (r.employeeName && r.employeeName.toLowerCase().includes(this.currentUserName.toLowerCase())) ||
        (r.employeeName && this.currentUserName.toLowerCase().includes(r.employeeName.toLowerCase()))
      );
      this.todayRecord = this.records.find(r => r.date === this.selectedDate);
    });

    this.api.loadAttendance(this.selectedDate).subscribe();
  }

  clockIn(): void {
    let empId = this.auth.user?.employeeId || this.currentEmployeeId;
    if (!empId) {
      const currentEmp = this.api.currentEmployees.find(e => e.name.toLowerCase() === this.currentUserName.toLowerCase());
      if (currentEmp) empId = currentEmp.id;
    }
    empId = empId || 1;

    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    this.api.clockIn(empId, this.selectedDate).subscribe({
      next: (res) => this.handleClockUpdate(res, nowTime, null),
      error: () => this.handleClockUpdate(null, nowTime, null)
    });
  }

  clockOut(): void {
    let empId = this.auth.user?.employeeId || this.currentEmployeeId;
    if (!empId) {
      const currentEmp = this.api.currentEmployees.find(e => e.name.toLowerCase() === this.currentUserName.toLowerCase());
      if (currentEmp) empId = currentEmp.id;
    }
    empId = empId || 1;

    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    this.api.clockOut(empId, this.selectedDate).subscribe({
      next: (res) => this.handleClockUpdate(res, null, nowTime),
      error: () => this.handleClockUpdate(null, null, nowTime)
    });
  }

  private handleClockUpdate(res: any, fallbackIn: string | null, fallbackOut: string | null): void {
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    let rec = this.records.find(r => r.date === this.selectedDate);
    if (!rec) {
      rec = {
        id: res?.id || Date.now(),
        date: this.selectedDate,
        employeeName: this.currentUserName,
        checkIn: res?.checkIn || fallbackIn || nowTime,
        checkOut: res?.checkOut || fallbackOut || null,
        workedHours: res?.workedHours || 8,
        status: 'Present'
      };
      this.records.unshift(rec);
    } else {
      if (res?.checkIn || fallbackIn) rec.checkIn = res?.checkIn || fallbackIn || nowTime;
      if (res?.checkOut || fallbackOut) {
        rec.checkOut = res?.checkOut || fallbackOut || nowTime;
        rec.workedHours = res?.workedHours || 8;
      }
      rec.status = 'Present';
    }
    this.todayRecord = { ...rec };

    // Update local cache
    const allAtt = JSON.parse(localStorage.getItem('synaptech-attendance') || '[]');
    const idx = allAtt.findIndex((a: any) => a.date === this.selectedDate && (a.employeeName === this.currentUserName || a.employeeId === rec.employeeId));
    if (idx >= 0) {
      allAtt[idx] = { ...allAtt[idx], ...rec };
    } else {
      allAtt.unshift(rec);
    }
    localStorage.setItem('synaptech-attendance', JSON.stringify(allAtt));
  }
}
