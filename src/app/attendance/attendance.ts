import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { ApiService } from '../services/api.service';
import { ErpPage } from '../shared/erp-page/erp-page';

interface AttendanceRecord {
  name: string;
  department: string;
  status: 'Present' | 'Absent' | 'Half-day' | 'Late' | 'Weekend';
  checkIn?: string;
  checkOut?: string;
  workedHours?: number;
  initials: string;
  date: string;
}

@Component({
  imports: [FormsModule, ErpPage],
  selector: 'app-attendance',
  styleUrl: './attendance.css',
  templateUrl: './attendance.html',
})
export class Attendance implements OnInit {
  private readonly storageKey = 'synaptech-attendance';
  /** The page opens on the user's local calendar date, not the UTC date. */
  selectedDate = this.localDate();
  records: AttendanceRecord[] = [];
  isWeekend = false;
  todayRecord?: AttendanceRecord;

  constructor(public auth: AuthService, private api: ApiService) {}

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

  ngOnInit(): void {
    this.sanitizeAttendanceStorage();

    this.api.employees$.subscribe(() => {
      this.loadOrCreateAttendance();
      this.loadTodayRecord();
    });

    this.api.loadEmployees().subscribe({
      next: () => {
        this.ensureDummyAttendance();
        this.loadOrCreateAttendance();
        this.loadTodayRecord();
      },
      error: () => {
        this.ensureDummyData();
        this.ensureDummyAttendance();
        this.loadOrCreateAttendance();
        this.loadTodayRecord();
      }
    });
  }

  /**
   * Your browser's saved attendance data has ended up with some malformed entries
   * (missing `date`) and duplicate name+date rows from earlier buggy versions of this
   * page. Those crashed `ensureDummyAttendance()` on every load (a thrown error inside
   * ngOnInit stops the rest of it from running, which is why only the header rendered).
   * This runs once per load, drops anything invalid, and keeps only the first record
   * per employee+date — self-healing the stored data instead of just avoiding the crash.
   */
  private sanitizeAttendanceStorage(): void {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      localStorage.removeItem(this.storageKey);
      return;
    }
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(this.storageKey);
      return;
    }

    const seen = new Set<string>();
    const clean: AttendanceRecord[] = [];
    for (const record of parsed as Partial<AttendanceRecord>[]) {
      if (!record || typeof record.date !== 'string' || typeof record.name !== 'string') continue;
      const key = `${record.name}|${record.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      clean.push(record as AttendanceRecord);
    }

    if (clean.length !== (parsed as unknown[]).length) {
      localStorage.setItem(this.storageKey, JSON.stringify(clean));
    }
  }

  private ensureDummyData(): void {
    const employees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]');
    if (employees.length === 0) {
      const dummyEmployees = [
        { name: 'Mansi Prajapati', email: 'mansi@synaptech.io', department: 'HR', role: 'People lead', status: 'Present', initials: 'MP', phone: '9876543210', joinDate: 'Jan 12, 2025', birthDate: 'May 14, 1998', reportingManager: '—', photoUrl: '' },
        { name: 'Rohan Mehta', email: 'rohan@synaptech.io', department: 'Developer', role: 'Tech lead', status: 'Present', initials: 'RM', phone: '9876543211', joinDate: 'Feb 03, 2025', birthDate: 'Aug 21, 1995', reportingManager: 'Mansi Prajapati', photoUrl: '' },
        { name: 'Neel Desai', email: 'neel@synaptech.io', department: 'Developer', role: 'Frontend developer', status: 'Present', initials: 'ND', phone: '9876543212', joinDate: 'Mar 18, 2025', birthDate: 'Jan 09, 1999', reportingManager: 'Rohan Mehta', photoUrl: '' },
        { name: 'Riya Shah', email: 'riya@synaptech.io', department: 'Interns', role: 'Product intern', status: 'Present', initials: 'RS', phone: '9876543213', joinDate: 'Jun 10, 2025', birthDate: 'Nov 02, 2003', reportingManager: 'Rohan Mehta', photoUrl: '' },
        { name: 'Aarav Shah', email: 'aarav@synaptech.io', department: 'HR', role: 'HR coordinator', status: 'Present', initials: 'AS', phone: '9876543214', joinDate: 'Apr 22, 2025', birthDate: 'Mar 27, 1997', reportingManager: 'Mansi Prajapati', photoUrl: '' }
      ];
      localStorage.setItem('synaptech-employees', JSON.stringify(dummyEmployees));
    }
  }

  private ensureDummyAttendance(): void {
    const today = new Date();
    const currentMonth = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0');
    const saved = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]') as AttendanceRecord[];
    const hasMonthRecords = saved.some(r => r?.date?.startsWith(currentMonth));
    // Also confirm today's exact date exists — if a previous (buggy) version of this generator
    // already ran and wrote timezone-shifted dates, hasMonthRecords alone would be true forever
    // and this would never repair itself. Regenerate the month whenever today's date is missing.
    const hasTodayRecord = saved.some(r => r.date === this.localDate(today));
    if (hasMonthRecords && hasTodayRecord) return;

    const employees = JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as Array<{ name: string; department: string; initials: string; }>;
    if (employees.length === 0) return;

    const dummyRecords: AttendanceRecord[] = [];
    const todayStr = this.localDate(today);
    // Use the actual number of days in this month, not a hardcoded 30 (was skipping the 31st on longer months).
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(today.getFullYear(), today.getMonth(), d);
      // Was: date.toISOString().slice(0, 10) — that converts to UTC first, which shifts the
      // date back a day in any timezone ahead of UTC. Use the same timezone-safe conversion
      // as `localDate()` so generated records land on the correct calendar day.
      const dateStr = this.localDate(date);
      // Skip today: if a real check-in already exists for today, don't clobber it during a repair pass.
      if (dateStr === todayStr) continue;
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      employees.forEach(emp => {
        const rand = Math.random();
        let status: 'Present' | 'Absent' | 'Late' | 'Half-day' = 'Present';
        if (rand < 0.6) status = 'Present';
        else if (rand < 0.75) status = 'Late';
        else if (rand < 0.9) status = 'Absent';
        else status = 'Half-day';

        let checkIn: string | undefined;
        let checkOut: string | undefined;
        let workedHours = 0;
        if (status !== 'Absent') {
          const hourIn = 9 + Math.floor(Math.random() * 3);
          const minIn = Math.floor(Math.random() * 60);
          const hourOut = 17 + Math.floor(Math.random() * 3);
          const minOut = Math.floor(Math.random() * 60);
          checkIn = `${hourIn}:${String(minIn).padStart(2, '0')} ${hourIn >= 12 ? 'PM' : 'AM'}`;
          checkOut = `${hourOut}:${String(minOut).padStart(2, '0')} ${hourOut >= 12 ? 'PM' : 'AM'}`;
          let worked = (hourOut * 60 + minOut) - (hourIn * 60 + minIn);
          if (worked < 0) worked += 24 * 60;
          workedHours = Math.round((worked / 60) * 100) / 100;
        }

        dummyRecords.push({
          name: emp.name,
          department: emp.department || 'Unassigned',
          status,
          checkIn,
          checkOut,
          workedHours,
          initials: emp.initials || emp.name.slice(0, 2).toUpperCase(),
          date: dateStr
        });
      });
    }
    // Drop this month's other records before writing the freshly (correctly) dated batch, but
    // keep today's own entry untouched in case a real clock-in already happened today.
    const keptFromOtherMonths = saved.filter(r => !r?.date?.startsWith(currentMonth) || r.date === todayStr);
    const all = [...keptFromOtherMonths, ...dummyRecords];
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  loadOrCreateAttendance(): void {
    const dateObj = new Date(this.selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    this.isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

    if (this.isWeekend) {
      this.records = [];
      this.todayRecord = undefined;
      return;
    }

    const employeesList = (this.api.currentEmployees && this.api.currentEmployees.length)
      ? this.api.currentEmployees
      : (JSON.parse(localStorage.getItem('synaptech-employees') ?? '[]') as Array<{ name: string; department?: string; initials?: string; role?: string; }>);
    const employees = employeesList.filter(e => e.role?.toLowerCase() !== 'admin');
    if (employees.length === 0) {
      this.records = [];
      this.todayRecord = undefined;
      return;
    }

    const saved = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]') as AttendanceRecord[];
    let dayRecords = saved.filter(record => record.date === this.selectedDate);

    if (dayRecords.length === 0) {
      dayRecords = employees.map(emp => ({
        name: emp.name,
        department: emp.department || 'Unassigned',
        status: 'Absent',
        checkIn: undefined,
        checkOut: undefined,
        workedHours: 0,
        initials: (emp as any).initials || emp.name.slice(0, 2).toUpperCase(),
        date: this.selectedDate
      }));
      const filtered = saved.filter(record => record.date !== this.selectedDate);
      const all = [...filtered, ...dayRecords];
      localStorage.setItem(this.storageKey, JSON.stringify(all));
    }

    this.records = dayRecords.sort((a, b) =>
      a.department.localeCompare(b.department) || a.name.localeCompare(b.name)
    );

    this.loadTodayRecord();
  }

  loadTodayRecord(): void {
    if (!this.isEmployee) return;
    const today = this.localDate();
    if (today !== this.selectedDate) {
      this.todayRecord = undefined;
      return;
    }
    const record = this.records.find(r => r.name === this.currentUserName && r.date === today);
    if (record) {
      this.todayRecord = record;
      if (record.checkIn && record.checkOut) {
        const [inHour, inMin] = this.parseTime(record.checkIn);
        const [outHour, outMin] = this.parseTime(record.checkOut);
        let worked = (outHour * 60 + outMin) - (inHour * 60 + inMin);
        if (worked < 0) worked += 24 * 60;
        record.workedHours = Math.round((worked / 60) * 100) / 100;
      } else {
        record.workedHours = 0;
      }
    } else {
      this.todayRecord = undefined;
    }
  }

  private parseTime(timeStr: string): [number, number] {
    const parts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/);
    if (!parts) return [0, 0];
    let hour = parseInt(parts[1]);
    const min = parseInt(parts[2]);
    const ampm = parts[3];
    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return [hour, min];
  }

  private localDate(date = new Date()): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }

  get visibleRecords(): AttendanceRecord[] {
    if (this.isWeekend) return [];
    if (this.isEmployee) {
      return this.records.filter(record => record.name === this.currentUserName);
    }
    return this.records;
  }

  get presentCount(): number {
    return this.visibleRecords.filter(record => record.status === 'Present' || record.status === 'Half-day').length;
  }

  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedDate = input.value;
    this.loadOrCreateAttendance();
    this.loadTodayRecord();
  }

  clockIn(): void {
    if (!this.todayRecord || this.todayRecord.checkIn) return;
    const now = new Date();
    this.todayRecord.checkIn = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(now);

    const [hour, min] = this.parseTime(this.todayRecord.checkIn);
    if (hour > 10 || (hour === 10 && min > 0)) {
      this.todayRecord.status = 'Late';
    } else {
      this.todayRecord.status = 'Present';
    }

    const saved = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]') as AttendanceRecord[];
    const idx = saved.findIndex(r => r.name === this.todayRecord!.name && r.date === this.todayRecord!.date);
    if (idx !== -1) {
      saved[idx] = this.todayRecord;
      localStorage.setItem(this.storageKey, JSON.stringify(saved));
    }
    this.loadOrCreateAttendance();
  }

  clockOut(): void {
    if (!this.todayRecord || !this.todayRecord.checkIn || this.todayRecord.checkOut) return;
    const now = new Date();
    this.todayRecord.checkOut = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(now);

    const [inHour, inMin] = this.parseTime(this.todayRecord.checkIn);
    const [outHour, outMin] = this.parseTime(this.todayRecord.checkOut);
    let worked = (outHour * 60 + outMin) - (inHour * 60 + inMin);
    if (worked < 0) worked += 24 * 60;
    this.todayRecord.workedHours = Math.round((worked / 60) * 100) / 100;

    const saved = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]') as AttendanceRecord[];
    const idx = saved.findIndex(r => r.name === this.todayRecord!.name && r.date === this.todayRecord!.date);
    if (idx !== -1) {
      saved[idx] = this.todayRecord;
      localStorage.setItem(this.storageKey, JSON.stringify(saved));
    }
    this.loadOrCreateAttendance();
  }

  toggleAttendance(record: AttendanceRecord): void {
    if (this.isEmployee && record.name !== this.currentUserName) return;
    if (this.isWeekend) return;

    const statusCycle: Record<string, 'Present' | 'Absent' | 'Half-day'> = {
      'Present': 'Absent',
      'Absent': 'Half-day',
      'Half-day': 'Present'
    };
    record.status = statusCycle[record.status] || 'Present';
    record.checkIn = undefined;
    record.checkOut = undefined;
    record.workedHours = 0;
    this.saveAll();
  }

  markAllPresent(): void {
    if (!this.canManage || this.isWeekend) return;
    const now = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    this.records.forEach(record => {
      record.status = 'Present';
      record.checkIn = now;
      record.checkOut = undefined;
      record.workedHours = 0;
    });
    this.saveAll();
  }

  downloadReport(): void {
    if (!this.canDownloadReport) return;
    const headers = ['Employee', 'Department', 'Status', 'Check-in', 'Check-out', 'Worked Hours'];
    const rows = this.records.map(r => [r.name, r.department, r.status, r.checkIn || '--', r.checkOut || '--', r.workedHours || 0]);
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${this.selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private saveAll(): void {
    const saved = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]') as AttendanceRecord[];
    const filtered = saved.filter(record => record.date !== this.selectedDate);
    const all = [...filtered, ...this.records];
    localStorage.setItem(this.storageKey, JSON.stringify(all));
    this.loadOrCreateAttendance();
  }

  get monthStats(): any {
    const userName = this.currentUserName;
    const currentMonth = this.selectedDate.slice(0, 7);
    const allSaved = JSON.parse(localStorage.getItem(this.storageKey) ?? '[]') as AttendanceRecord[];
    const monthRecords = allSaved.filter(r =>
      r?.date?.startsWith(currentMonth) &&
      (this.isEmployee ? r.name === userName : true)
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
      (this.isEmployee ? l.name === userName : true)
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
      remainingLeaves: totalLeavesPerYear - usedLeaves,
      totalDays: present + absent + late + half
    };
  }
}