import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';
import { ApiService, BreakLogItem } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './my-attendance.html',
  styleUrl: './my-attendance.css'
})
export class MyAttendance implements OnInit, OnDestroy {
  selectedDate = new Date().toISOString().slice(0, 10);
  todayRecord?: any;
  records: any[] = [];
  currentEmployeeId?: number;

  // Live Digital Clock
  currentTimeStr = '';
  private clockTimer: any = null;

  // Keka Break System State
  breakTypes = [
    { label: 'Lunch Break (45m)', value: 'Lunch Break' },
    { label: 'Tea / Coffee Break (15m)', value: 'Tea Break' },
    { label: 'Personal / Short Break', value: 'Short Break' },
    { label: 'Official Work Break', value: 'Official Break' }
  ];
  selectedBreakType = 'Lunch Break';

  // Manual Punch Correction Modal
  showManualModal = false;
  manualCheckIn = '09:00 AM';
  manualCheckOut = '06:00 PM';
  manualBreakStart = '01:00 PM';
  manualBreakEnd = '01:45 PM';
  manualBreakType = 'Lunch Break';
  manualReason = '';
  manualMsg = '';

  constructor(public auth: AuthService, private api: ApiService) {}

  get currentUserName(): string {
    return this.auth.user?.employeeName || this.auth.user?.name || 'Employee';
  }

  ngOnInit(): void {
    this.updateLiveClock();
    this.clockTimer = setInterval(() => this.updateLiveClock(), 1000);

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

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
  }

  private updateLiveClock(): void {
    const now = new Date();
    this.currentTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  get isOnBreak(): boolean {
    return !!(this.todayRecord?.isOnBreak || (this.todayRecord?.breakStart && !this.todayRecord?.breakEnd));
  }

  get parsedBreakLogs(): BreakLogItem[] {
    if (!this.todayRecord?.breakLogs) return [];
    try {
      return JSON.parse(this.todayRecord.breakLogs) || [];
    } catch {
      return [];
    }
  }

  get totalBreakMins(): number {
    if (this.todayRecord?.totalBreakMinutes) {
      return this.todayRecord.totalBreakMinutes;
    }
    const logs = this.parsedBreakLogs;
    return logs.reduce((acc, b) => acc + (b.durationMins || 0), 0);
  }

  get grossWorkedHours(): number {
    if (!this.todayRecord?.checkIn) return 0;
    const checkInStr = this.todayRecord.checkIn;
    const checkOutStr = this.todayRecord.checkOut;

    const inDate = this.parseTimeString(checkInStr);
    if (!inDate) return 0;

    const outDate = checkOutStr ? this.parseTimeString(checkOutStr) : new Date();
    if (!outDate) return 0;

    const diffMs = outDate.getTime() - inDate.getTime();
    return Math.max(0, Math.round((diffMs / 3600000) * 10) / 10);
  }

  get effectiveWorkedHours(): number {
    if (this.todayRecord?.workedHours && this.todayRecord?.checkOut) {
      return this.todayRecord.workedHours;
    }
    const gross = this.grossWorkedHours;
    const breakHrs = this.totalBreakMins / 60.0;
    return Math.max(0, Math.round((gross - breakHrs) * 10) / 10);
  }

  get workingHoursLeft(): number {
    const target = 8.0; // Standard 8 hours workday
    const remaining = target - this.effectiveWorkedHours;
    return Math.max(0, Math.round(remaining * 10) / 10);
  }

  get shiftProgressPercent(): number {
    const target = 8.0;
    return Math.min(100, Math.round((this.effectiveWorkedHours / target) * 100));
  }

  private parseTimeString(timeStr: string): Date | null {
    if (!timeStr) return null;
    const now = new Date();
    const match = timeStr.match(/(\d+):(\d+)(?::(\d+))?\s*(AM|PM)?/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[4]?.toUpperCase();

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    return d;
  }

  toggleBreak(): void {
    let empId = this.auth.user?.employeeId || this.currentEmployeeId;
    if (!empId) {
      const currentEmp = this.api.currentEmployees.find(e => e.name.toLowerCase() === this.currentUserName.toLowerCase());
      if (currentEmp) empId = currentEmp.id;
    }
    empId = empId || 1;

    this.api.toggleBreak(empId, this.selectedDate, this.selectedBreakType).subscribe({
      next: (res) => {
        if (this.todayRecord) {
          this.todayRecord.breakTime = res.breakTime;
          this.todayRecord.breakStart = res.breakStart;
          this.todayRecord.breakEnd = res.breakEnd;
          this.todayRecord.isOnBreak = !!res.isOnBreak;
          this.todayRecord.totalBreakMinutes = res.totalBreakMinutes;
          this.todayRecord.breakLogs = res.breakLogs;
        }
      },
      error: (err) => console.error('Break toggle error', err)
    });
  }

  clockIn(): void {
    let empId = this.auth.user?.employeeId || this.currentEmployeeId;
    if (!empId) {
      const currentEmp = this.api.currentEmployees.find(e => e.name.toLowerCase() === this.currentUserName.toLowerCase());
      if (currentEmp) empId = currentEmp.id;
    }
    empId = empId || 1;

    this.api.clockIn(empId, this.selectedDate).subscribe({
      next: (res) => {
        this.todayRecord = { ...res };
      },
      error: (err) => console.error('Clock in error', err)
    });
  }

  clockOut(): void {
    let empId = this.auth.user?.employeeId || this.currentEmployeeId;
    if (!empId) {
      const currentEmp = this.api.currentEmployees.find(e => e.name.toLowerCase() === this.currentUserName.toLowerCase());
      if (currentEmp) empId = currentEmp.id;
    }
    empId = empId || 1;

    this.api.clockOut(empId, this.selectedDate).subscribe({
      next: (res) => {
        this.todayRecord = { ...res };
      },
      error: (err) => console.error('Clock out error', err)
    });
  }

  openManualModal(): void {
    this.manualCheckIn = this.todayRecord?.checkIn || '09:00 AM';
    this.manualCheckOut = this.todayRecord?.checkOut || '06:00 PM';
    this.manualBreakStart = this.todayRecord?.breakStart || '01:00 PM';
    this.manualBreakEnd = this.todayRecord?.breakEnd || '01:45 PM';
    this.manualBreakType = 'Lunch Break';
    this.manualReason = '';
    this.manualMsg = '';
    this.showManualModal = true;
  }

  closeManualModal(): void {
    this.showManualModal = false;
  }

  submitManualPunch(): void {
    let empId = this.auth.user?.employeeId || this.currentEmployeeId;
    if (!empId) {
      const currentEmp = this.api.currentEmployees.find(e => e.name.toLowerCase() === this.currentUserName.toLowerCase());
      if (currentEmp) empId = currentEmp.id;
    }
    empId = empId || 1;

    const payload = {
      employeeId: empId,
      date: this.selectedDate,
      checkIn: this.manualCheckIn,
      checkOut: this.manualCheckOut,
      breakStart: this.manualBreakStart,
      breakEnd: this.manualBreakEnd,
      breakType: this.manualBreakType,
      reason: this.manualReason
    };

    this.api.manualPunch(payload).subscribe({
      next: (res) => {
        this.todayRecord = { ...res };
        this.manualMsg = 'Manual punch record saved successfully!';
        setTimeout(() => {
          this.manualMsg = '';
          this.showManualModal = false;
        }, 1500);
      },
      error: (err) => {
        console.error('Manual punch error', err);
      }
    });
  }
}
