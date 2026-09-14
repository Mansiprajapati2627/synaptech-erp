import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth.service';
import { ApiService, AttendanceRecord as ApiAttendanceRecord } from '../services/api.service';
import { ErpPage } from '../shared/erp-page/erp-page';

interface AttendanceRecord {
  id?: number;
  employeeId?: number;
  name: string;
  department: string;
  status: 'Present' | 'Absent' | 'Half-day' | 'Late' | 'Weekend';
  checkIn?: string;
  checkOut?: string;
  workedHours?: number;
  initials: string;
  date: string;
}

interface RegularizationRequest {
  id: string;
  employeeName: string;
  date: string;
  reason: string;
  type: 'Missing Punch' | 'Late Arrival' | 'Correction';
  status: 'Pending' | 'Approved' | 'Declined';
}

@Component({
  imports: [FormsModule, ErpPage],
  selector: 'app-attendance',
  styleUrl: './attendance.css',
  templateUrl: './attendance.html',
})
export class Attendance implements OnInit {
  activeTab: 'my' | 'team' | 'all' | 'regularization' | 'reports' = 'all';
  selectedDate = this.localDate();
  selectedMonth = this.selectedDate.slice(0, 7);
  records: AttendanceRecord[] = [];
  isWeekend = false;
  todayRecord?: AttendanceRecord;
  currentEmployeeId?: number;
  downloadingMonthly = false;

  // Regularization mock state
  regularizationRequests: RegularizationRequest[] = [
    { id: 'reg-1', employeeName: 'Aarav Shah', date: '2026-09-10', reason: 'Forgot to check in on app due to client meeting', type: 'Missing Punch', status: 'Pending' },
    { id: 'reg-2', employeeName: 'Riya Shah', date: '2026-09-11', reason: 'Heavy traffic delay on highway', type: 'Late Arrival', status: 'Approved' }
  ];
  newRegDate = this.localDate();
  newRegReason = '';
  newRegType: 'Missing Punch' | 'Late Arrival' | 'Correction' = 'Missing Punch';
  regSuccessMsg = '';

  constructor(public auth: AuthService, private api: ApiService, private route: ActivatedRoute) {}

  logout(): void { this.auth.logout(); }

  get isEmployee(): boolean { return this.auth.role === 'Employee'; }
  get canManage(): boolean { return this.auth.hasRole(['Admin', 'HR']); }
  get canDownloadReport(): boolean { return this.auth.hasRole(['Admin', 'HR']); }

  get formattedDate(): string {
    const date = new Date(this.selectedDate + 'T00:00:00');
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  get currentUserName(): string {
    return this.auth.user?.employeeName || this.auth.user?.name || '';
  }

  get isToday(): boolean {
    return this.selectedDate === this.localDate();
  }

  get todayDateStr(): string {
    return this.localDate();
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'] as any;
      } else {
        this.activeTab = this.isEmployee ? 'my' : (this.auth.role === 'Manager' ? 'team' : 'all');
      }
    });

    // 1. Subscribe to reactive attendances stream
    this.api.attendances$.subscribe((apiRecords) => {
      this.processAttendanceRecords(apiRecords);
    });

    // 2. Fetch fresh attendance from database for selectedDate
    this.api.loadAttendance(this.selectedDate).subscribe({
      next: (apiRecords) => this.processAttendanceRecords(apiRecords),
      error: () => {}
    });

    // 3. Ensure employee directory is loaded to identify current user
    this.api.employees$.subscribe(employees => {
      const currentEmp = employees.find(
        e => e.name.toLowerCase() === this.currentUserName.toLowerCase() ||
             (this.auth.user?.email && e.email.toLowerCase() === this.auth.user.email.toLowerCase())
      );
      if (currentEmp) {
        this.currentEmployeeId = currentEmp.id;
        this.loadTodayRecord();
      }
    });

    this.api.loadEmployees().subscribe();
  }

  submitRegularization(): void {
    if (!this.newRegReason.trim()) return;
    this.regularizationRequests.unshift({
      id: 'reg-' + Date.now(),
      employeeName: this.currentUserName,
      date: this.newRegDate,
      reason: this.newRegReason.trim(),
      type: this.newRegType,
      status: 'Pending'
    });
    this.newRegReason = '';
    this.regSuccessMsg = 'Regularization request submitted!';
    setTimeout(() => this.regSuccessMsg = '', 3000);
  }

  updateRegStatus(req: RegularizationRequest, status: 'Approved' | 'Declined'): void {
    req.status = status;
  }

  private processAttendanceRecords(apiRecords: ApiAttendanceRecord[]): void {
    const dateObj = new Date(this.selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    this.isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

    const formatted: AttendanceRecord[] = (apiRecords || []).map(r => ({
      id: r.id,
      employeeId: r.employeeId,
      name: r.employeeName,
      department: r.department || 'Unassigned',
      status: r.status,
      checkIn: r.checkIn || undefined,
      checkOut: r.checkOut || undefined,
      workedHours: r.workedHours || 0,
      initials: r.initials || (r.employeeName.length >= 2 ? r.employeeName.slice(0, 2).toUpperCase() : r.employeeName.toUpperCase()),
      date: r.date
    }));

    this.records = formatted;
    this.loadTodayRecord();
  }

  private loadTodayRecord(): void {
    if (!this.isToday) {
      this.todayRecord = undefined;
      return;
    }

    const record = this.records.find(r =>
      (this.currentEmployeeId && r.employeeId === this.currentEmployeeId) ||
      r.name.toLowerCase() === this.currentUserName.toLowerCase()
    );

    this.todayRecord = record;
  }

  private localDate(date = new Date()): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }

  get visibleRecords(): AttendanceRecord[] {
    if (this.isWeekend) return [];
    if (this.isEmployee) {
      // Employees see ONLY their own personal attendance record!
      return this.records.filter(r =>
        (this.currentEmployeeId && r.employeeId === this.currentEmployeeId) ||
        r.name.toLowerCase() === this.currentUserName.toLowerCase()
      );
    }
    return this.records;
  }

  get presentCount(): number {
    return this.visibleRecords.filter(record => record.status === 'Present' || record.status === 'Half-day' || record.status === 'Late').length;
  }

  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedDate = input.value;
    if (this.selectedDate) {
      this.selectedMonth = this.selectedDate.slice(0, 7);
    }
    this.api.loadAttendance(this.selectedDate).subscribe({
      next: (apiRecords) => this.processAttendanceRecords(apiRecords)
    });
  }

  onMonthChange(monthValue: string): void {
    if (monthValue) {
      this.selectedMonth = monthValue;
    }
  }

  clockIn(): void {
    const empId = this.currentEmployeeId || this.todayRecord?.employeeId;
    if (!empId) {
      // Fallback: search by name
      const currentEmp = this.api.currentEmployees.find(e => e.name.toLowerCase() === this.currentUserName.toLowerCase());
      if (currentEmp) {
        this.currentEmployeeId = currentEmp.id;
        this.api.clockIn(currentEmp.id, this.selectedDate).subscribe();
      }
      return;
    }

    this.api.clockIn(empId, this.selectedDate).subscribe();
  }

  clockOut(): void {
    const empId = this.currentEmployeeId || this.todayRecord?.employeeId;
    if (!empId) {
      const currentEmp = this.api.currentEmployees.find(e => e.name.toLowerCase() === this.currentUserName.toLowerCase());
      if (currentEmp) {
        this.currentEmployeeId = currentEmp.id;
        this.api.clockOut(currentEmp.id, this.selectedDate).subscribe();
      }
      return;
    }

    this.api.clockOut(empId, this.selectedDate).subscribe();
  }

  toggleAttendance(record: AttendanceRecord): void {
    if (this.isEmployee && record.name.toLowerCase() !== this.currentUserName.toLowerCase()) return;
    if (this.isWeekend || !record.employeeId) return;

    const statusCycle: Record<string, 'Present' | 'Absent' | 'Half-day'> = {
      'Present': 'Absent',
      'Absent': 'Half-day',
      'Half-day': 'Present',
      'Late': 'Absent',
      'Weekend': 'Present'
    };
    const newStatus = statusCycle[record.status] || 'Present';
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    this.api.updateAttendanceRecord({
      employeeId: record.employeeId,
      date: this.selectedDate,
      status: newStatus,
      checkIn: newStatus === 'Present' || newStatus === 'Half-day' ? (record.checkIn || now) : null,
      checkOut: newStatus === 'Present' || newStatus === 'Half-day' ? record.checkOut : null,
      workedHours: newStatus === 'Absent' ? 0 : (record.workedHours || 0)
    }).subscribe();
  }

  markAllPresent(): void {
    if (!this.canManage || this.isWeekend) return;
    this.api.markAllPresent(this.selectedDate).subscribe();
  }

  downloadReport(): void {
    this.downloadMonthlyReport();
  }

  downloadMonthlyReport(): void {
    if (!this.canDownloadReport || this.downloadingMonthly) return;
    this.downloadingMonthly = true;

    this.api.getMonthlyAttendance(this.selectedMonth).subscribe({
      next: (records) => {
        this.downloadingMonthly = false;
        const raw = Array.isArray(records) ? records : ((records as any)?.value || []);

        const headers = ['Date', 'Employee ID', 'Employee Name', 'Department', 'Status', 'Check-In', 'Check-Out', 'Worked Hours (hrs)'];

        const rows = raw.map((r: ApiAttendanceRecord) => [
          r.date,
          r.employeeId,
          `"${(r.employeeName || '').replace(/"/g, '""')}"`,
          `"${(r.department || 'Unassigned').replace(/"/g, '""')}"`,
          r.status,
          r.checkIn ? `"${r.checkIn}"` : '--',
          r.checkOut ? `"${r.checkOut}"` : '--',
          r.workedHours || 0
        ]);

        const csvContent = [headers.join(','), ...rows.map((row: (string | number)[]) => row.join(','))].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `attendance-monthly-report-${this.selectedMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Failed to download monthly attendance report:', err);
        this.downloadingMonthly = false;
      }
    });
  }

  get monthStats(): any {
    const userName = this.currentUserName.toLowerCase();
    const currentMonth = this.selectedDate.slice(0, 7);
    const monthRecords = this.records.filter(r =>
      r.date.startsWith(currentMonth) &&
      (this.isEmployee ? r.name.toLowerCase() === userName : true)
    );

    let present = 0, absent = 0, late = 0, half = 0;
    monthRecords.forEach(r => {
      if (r.status === 'Present') present++;
      else if (r.status === 'Absent') absent++;
      else if (r.status === 'Late') late++;
      else if (r.status === 'Half-day') half++;
    });

    const leaveRequests = JSON.parse(localStorage.getItem('synaptech-leave-requests') ?? '[]') as Array<{ name: string; status: string; days: number; }>;
    let usedLeaves = 0;
    const approvedLeaves = leaveRequests.filter(l =>
      l.status === 'Approved' &&
      (this.isEmployee ? l.name.toLowerCase() === userName : true)
    );
    approvedLeaves.forEach(l => {
      usedLeaves += l.days || 0;
    });

    const totalLeavesPerYear = 12;
    return {
      present,
      absent,
      late,
      half,
      usedLeaves,
      totalLeavesPerYear,
      remainingLeaves: Math.max(0, totalLeavesPerYear - usedLeaves),
      totalDays: present + absent + late + half
    };
  }
}