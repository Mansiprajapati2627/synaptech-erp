// src/app/dashboard/dashboard.ts
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { AuthService, PageKey } from '../auth.service';

interface Announcement { title: string; detail: string; icon: string; }
interface EmployeeRecord { name: string; email: string; department: string; role: string; status: string; initials: string; phone: string; joinDate: string; birthDate: string; }
interface ProjectRecord { name: string; status: 'On track' | 'At risk' | 'Completed'; progress: number; color: string; }

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
  totalEmployees = 5;
  presentToday = 5;
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
  private clockTimer?: number;

  constructor(public auth: AuthService) {}

  logout(): void { this.auth.logout(); }

  ngOnInit(): void {
    const savedAnnouncements = localStorage.getItem(this.announcementsKey);
    if (savedAnnouncements) this.announcements = JSON.parse(savedAnnouncements) as Announcement[];
    this.loadEmployeeMetrics();
    this.clockTimer = window.setInterval(() => {
      this.currentTime.set(new Date());
      this.loadEmployeeMetrics();
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

  get activeProjects(): number {
    const projects = JSON.parse(localStorage.getItem('synaptech-projects') ?? '[]') as Array<{ status: string }>;
    return projects.length || 2;
  }

  get pendingLeaves(): number {
    const requests = JSON.parse(localStorage.getItem('synaptech-leave-requests') ?? '[]') as Array<{ status: string; name: string }>;
    return requests.filter(request => request.status === 'Pending' && (this.role !== 'Employee' || request.name === this.auth.user?.employeeName)).length;
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

  openProfile(): void { this.showProfile = true; }
  closeProfile(): void { this.showProfile = false; }

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
    const saved = localStorage.getItem('synaptech-projects');
    if (!saved) return [];
    return (JSON.parse(saved) as ProjectRecord[]).slice(0, 3);
  }

  statusClass(status: string): string {
    if (status === 'At risk') return 'at-risk';
    if (status === 'Completed') return 'completed';
    return 'on-track';
  }

  // 🔥 NEW: My Tasks widget
  get myTasks(): any[] {
    const projects = JSON.parse(localStorage.getItem('synaptech-projects') || '[]') as any[];
    const userName = this.auth.user?.name;
    if (!userName) return [];
    const tasks: any[] = [];
    projects.forEach(p => {
      p.tasks?.forEach((t: any) => {
        if (t.assignedTo === userName) {
          tasks.push({ ...t, projectName: p.name });
        }
      });
    });
    return tasks
      .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'))
      .slice(0, 5);
  }

  private loadEmployeeMetrics(): void {
    const savedEmployees = localStorage.getItem('synaptech-employees');
    if (!savedEmployees) return;
    const employees = JSON.parse(savedEmployees) as Array<{ status: string }>;
    this.totalEmployees = employees.length;
    this.presentToday = employees.filter(employee => employee.status === 'Present').length;
    this.onLeave = employees.filter(employee => employee.status === 'On leave').length;
    const departments = JSON.parse(localStorage.getItem('synaptech-departments') ?? '[]') as unknown[];
    this.departmentCount = departments.length;
  }
}