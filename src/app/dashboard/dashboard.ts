import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { AuthService, PageKey } from '../auth.service';
import { ApiService, Employee } from '../services/api.service';

interface Announcement { title: string; detail: string; icon: string; }
interface EmployeeRecord { name: string; email: string; department: string; role: string; status: string; initials: string; phone: string; joinDate: string; birthDate: string; }
interface ProjectTask { id: string; title: string; done: boolean; assignee: string; dueDate: string; }
interface ProjectActivity { id: string; text: string; date: string; }
interface ProjectRecord { name: string; status: 'On track' | 'At risk' | 'Completed'; progress: number; color: string; deadline?: string; tasks?: ProjectTask[]; activity?: ProjectActivity[]; }
interface LeaveRequest { name?: string; employeeName?: string; type?: string; leaveType?: string; reason?: string; status?: string; date?: string; }
interface MyTaskItem { id: string; title: string; projectName: string; dueDate: string; done: boolean; }
interface CalendarDay { day: number | null; isToday: boolean; }

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-dashboard',
  styleUrl: './dashboard.css',
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit, OnDestroy {
  readonly currentTime = signal(new Date());
  readonly openRoles = 3;
  readonly announcementsKey = 'synaptech-announcements';
  readonly quote = 'Great teams build a greater tomorrow.';
  totalEmployees = 0;
  presentToday = 0;
  onLeave = 0;
  departmentCount = 3;
  announcements: Announcement[] = [
    { title: 'Welcome Riya to the Interns team', detail: 'Posted today by HR', icon: '🎉' },
    { title: 'Office will remain closed on Sep 15', detail: 'Posted yesterday by Admin', icon: '📢' },
    { title: 'September birthdays', detail: '2 birthdays this month', icon: '🎂' }
  ];
  showAnnouncementForm = false;
  newAnnouncement = '';
  showAllAnnouncements = false;
  showProfile = false;
  showNotifications = false;
  searchTerm = '';
  calendarOffset = 0;
  private clockTimer?: number;

  constructor(public auth: AuthService, private api: ApiService) {}

  logout(): void { this.auth.logout(); }

  ngOnInit(): void {
    const savedAnnouncements = localStorage.getItem(this.announcementsKey);
    if (savedAnnouncements) this.announcements = JSON.parse(savedAnnouncements) as Announcement[];
    
    this.loadEmployeeMetricsFromStorage();

    // Subscribe to real-time streams
    this.api.employees$.subscribe(employees => {
      if (employees && employees.length > 0) {
        this.updateMetricsFromEmployees(employees);
      }
    });

    this.api.attendances$.subscribe((records) => {
      if (records && records.length > 0) {
        this.presentToday = records.filter(r => r.status === 'Present' || r.status === 'Late' || r.status === 'Half-day').length;
        this.onLeave = records.filter(r => r.status === 'Absent').length;
      }
    });

    this.api.departments$.subscribe((depts) => {
      if (depts) {
        this.departmentCount = depts.length;
      }
    });

    // Fresh fetches from backend API
    this.api.loadEmployees().subscribe({
      next: (employees) => this.updateMetricsFromEmployees(employees),
      error: () => this.loadEmployeeMetricsFromStorage()
    });
    this.api.loadAttendance().subscribe();
    this.api.loadDepartments().subscribe();

    this.clockTimer = window.setInterval(() => {
      this.currentTime.set(new Date());
      this.api.loadEmployees().subscribe({
        next: (employees) => this.updateMetricsFromEmployees(employees),
        error: () => this.loadEmployeeMetricsFromStorage()
      });
    }, 60_000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer !== undefined) {
      window.clearInterval(this.clockTimer);
    }
  }

  get greeting(): string {
    const hour = this.currentTime().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get attendancePercentage(): number {
    if (!this.totalEmployees) return 0;
    return Math.round((this.presentToday / this.totalEmployees) * 100);
  }

  get formattedDate(): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(this.currentTime());
  }

  get userName(): string { return this.auth.user?.name ?? 'Mansi'; }
  get role(): string { return this.auth.role ?? 'Employee'; }

  private get projects(): ProjectRecord[] {
    return JSON.parse(localStorage.getItem('synaptech-projects') ?? '[]') as ProjectRecord[];
  }

  get activeProjects(): number {
    return this.projects.length || 2;
  }

  private get leaveRequestsRaw(): LeaveRequest[] {
    return JSON.parse(localStorage.getItem('synaptech-leave-requests') ?? '[]') as LeaveRequest[];
  }

  get pendingLeaves(): number {
    return this.leaveRequestsRaw.filter(request => request.status === 'Pending' && (this.role !== 'Employee' || (request.name ?? request.employeeName) === this.auth.user?.employeeName)).length;
  }

  get actionItems(): string[] {
    if (this.role === 'HR') return [`${this.pendingLeaves} leave requests awaiting approval`, '2 employee profiles need completion', '1 onboarding task pending', '0 overdue reports'];
    if (this.role === 'Manager') return [`${this.pendingLeaves} leave requests to review`, '3 project tasks overdue', 'Schedule a team meeting', '1 project deadline this week'];
    if (this.role === 'Employee') return ["Submit today's timesheet", 'Complete profile', this.pendingLeaves ? `${this.pendingLeaves} pending leave request` : 'No pending leave requests'];
    return [`${this.pendingLeaves} pending leave requests`, `${this.totalEmployees} employees in workspace`, 'Review access permissions', '3 open positions to fill'];
  }

  get peopleCount(): number { return this.totalEmployees; }

  toggleAnnouncementForm(): void { this.showAnnouncementForm = !this.showAnnouncementForm; }

  addAnnouncement(): void {
    if (!this.newAnnouncement.trim() || !this.auth.hasRole(['Admin', 'HR'])) return;
    this.announcements.unshift({ title: this.newAnnouncement.trim(), detail: `Posted today by ${this.role}`, icon: '📣' });
    localStorage.setItem(this.announcementsKey, JSON.stringify(this.announcements));
    this.newAnnouncement = '';
    this.showAnnouncementForm = false;
  }

  get visibleAnnouncements(): Announcement[] {
    return this.showAllAnnouncements ? this.announcements : this.announcements.slice(0, 3);
  }

  toggleAllAnnouncements(): void { this.showAllAnnouncements = !this.showAllAnnouncements; }

  openProfile(): void { this.showProfile = true; this.showNotifications = false; }
  closeProfile(): void { this.showProfile = false; }

  toggleNotifications(): void { this.showNotifications = !this.showNotifications; }
  closeNotifications(): void { this.showNotifications = false; }

  get employeeRecord(): EmployeeRecord | undefined {
    const saved = localStorage.getItem('synaptech-employees');
    if (!saved) return undefined;
    const employees = JSON.parse(saved) as EmployeeRecord[];
    const user = this.auth.user;
    return employees.find(employee => employee.name === user?.employeeName || employee.email === user?.email);
  }

  get accessiblePages(): string[] {
    return (Object.keys(this.auth.pageLabels) as PageKey[])
      .filter(page => this.auth.canAccess(page))
      .map(page => this.auth.pageLabels[page]);
  }

  get projectOverview(): ProjectRecord[] {
    return this.projects.slice(0, 3);
  }

  statusClass(status: string): string {
    if (status === 'At risk') return 'at-risk';
    if (status === 'Completed') return 'completed';
    return 'on-track';
  }

  /** Real counts from your projects — used by the Project Status donut. */
  get projectStatusBreakdown() {
    const projects = this.projects;
    const onTrack = projects.filter(project => project.status === 'On track').length;
    const atRisk = projects.filter(project => project.status === 'At risk').length;
    const completed = projects.filter(project => project.status === 'Completed').length;
    const total = projects.length || 1;
    return { onTrack, atRisk, completed, total: projects.length, pctOnTrack: (onTrack / total) * 100, pctAtRisk: (atRisk / total) * 100, pctCompleted: (completed / total) * 100 };
  }

  /**
   * Illustrative weekly attendance bars. This app only stores today's status
   * (no daily history yet), so each day's bar is derived from today's real
   * present/total count with a small deterministic variation — it becomes a
   * true day-by-day chart once attendance history is tracked in the backend.
   */
  get attendanceWeek(): { day: string; present: number }[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const base = this.presentToday;
    const variation = [0, 1, -1, 1, 0, -2, -3];
    return days.map((day, index) => ({
      day,
      present: Math.max(0, Math.min(this.totalEmployees, base + variation[index]))
    }));
  }

  get recentLeaveRequests(): Array<{ name: string; type: string; status: string }> {
    return this.leaveRequestsRaw.slice(0, 4).map(request => ({
      name: request.name ?? request.employeeName ?? 'Unknown',
      type: request.type ?? request.leaveType ?? request.reason ?? 'Leave',
      status: request.status ?? 'Pending'
    }));
  }

  /** Most recent activity entry from each project, newest project data first. */
  get recentActivityFeed(): Array<{ initials: string; text: string; date: string }> {
    return this.projects
      .filter(project => project.activity?.length)
      .slice(0, 4)
      .map(project => ({
        initials: project.name.slice(0, 2).toUpperCase(),
        text: `${project.activity![0].text} — ${project.name}`,
        date: project.activity![0].date
      }));
  }

  get upcomingDeadlines(): Array<{ label: string; date: string }> {
    return this.projects
      .filter(project => !!project.deadline)
      .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
      .slice(0, 3)
      .map(project => ({
        label: `${project.name} deadline`,
        date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(project.deadline!))
      }));
  }

  get myTasks(): MyTaskItem[] {
    const identity = this.auth.user?.employeeName ?? this.auth.user?.name;
    if (!identity) return [];
    const tasks: MyTaskItem[] = [];
    this.projects.forEach(project => {
      (project.tasks ?? []).forEach(task => {
        if (task.assignee === identity && !task.done) {
          tasks.push({ id: task.id, title: task.title, projectName: project.name, dueDate: task.dueDate, done: task.done });
        }
      });
    });
    return tasks
      .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
      .slice(0, 5);
  }

  get notifications(): Array<{ icon: string; text: string }> {
    const items: Array<{ icon: string; text: string }> = [];
    const overdue = this.myTasks.filter(task => task.dueDate && task.dueDate < new Date().toISOString().slice(0, 10));
    if (overdue.length) items.push({ icon: '⏰', text: `${overdue.length} of your tasks are overdue` });
    if (this.pendingLeaves) items.push({ icon: '🕐', text: `${this.pendingLeaves} pending leave request${this.pendingLeaves === 1 ? '' : 's'}` });
    const dueSoon = this.myTasks.length - overdue.length;
    if (dueSoon > 0) items.push({ icon: '📌', text: `${dueSoon} task${dueSoon === 1 ? '' : 's'} assigned to you` });
    return items;
  }

  // ---- Calendar widget (fully functional, real current month) ----
  get calendarMonthLabel(): string {
    const date = this.calendarBaseDate();
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
  }

  get calendarDays(): CalendarDay[] {
    const base = this.calendarBaseDate();
    const year = base.getFullYear();
    const month = base.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    const cells: CalendarDay[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, isToday: false });
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, isToday: isCurrentMonth && today.getDate() === day });
    }
    return cells;
  }

  previousMonth(): void { this.calendarOffset -= 1; }
  nextMonth(): void { this.calendarOffset += 1; }

  private calendarBaseDate(): Date {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() + this.calendarOffset);
    return date;
  }



  private updateMetricsFromEmployees(employees: Employee[]): void {
    if (!employees) return;
    const nonAdmin = employees.filter(e => e.role && e.role.toLowerCase() !== 'admin');
    this.totalEmployees = nonAdmin.length;
    const currentAtt = this.api.currentAttendances;
    if (currentAtt && currentAtt.length > 0) {
      this.presentToday = currentAtt.filter(r => r.status === 'Present' || r.status === 'Late' || r.status === 'Half-day').length;
      this.onLeave = currentAtt.filter(r => r.status === 'Absent').length;
    } else {
      this.presentToday = nonAdmin.filter(e => e.status === 'Present').length;
      this.onLeave = nonAdmin.filter(e => e.status === 'On leave').length;
    }
    const departments = this.api.currentDepartments;
    this.departmentCount = departments && departments.length > 0 ? departments.length : (JSON.parse(localStorage.getItem('synaptech-departments') ?? '[]') as unknown[]).length;
  }

  private loadEmployeeMetricsFromStorage(): void {
    const savedEmployees = localStorage.getItem('synaptech-employees');
    if (!savedEmployees) return;
    try {
      const employees = JSON.parse(savedEmployees) as Array<{ role?: string; status: string }>;
      const nonAdmin = employees.filter(e => e.role?.toLowerCase() !== 'admin');
      this.totalEmployees = nonAdmin.length;
      this.presentToday = nonAdmin.filter(e => e.status === 'Present').length;
      this.onLeave = nonAdmin.filter(e => e.status === 'On leave').length;
    } catch {}
    const departments = JSON.parse(localStorage.getItem('synaptech-departments') ?? '[]') as unknown[];
    this.departmentCount = departments.length;
  }
}