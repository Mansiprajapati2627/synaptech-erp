import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Designation {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  status: string;
}

export interface EmploymentType {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  status: string;
}

export interface EmploymentStatus {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  status: string;
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName?: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string | null;
  status: string;
  appliedOn: string;
  approvedBy?: string | null;
  actionDate?: string | null;
}

export interface CreateLeaveRequest {
  employeeId: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
}

export interface Shift {
  id: number;
  name: string;
  code: string;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
  status: string;
}

export interface EmployeeDocument {
  id: number;
  employeeId: number;
  employeeName?: string | null;
  documentName: string;
  documentType: string;
  documentNumber?: string | null;
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  contentType?: string | null;
  status: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateEmployeeDocumentRequest {
  documentName: string;
  documentType: string;
  documentNumber?: string | null;
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  contentType?: string | null;
  status?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
}

export interface EmployeeEmployment {
  id?: number;
  employeeId?: number;
  departmentId?: number | null;
  departmentName?: string | null;
  designationId?: number | null;
  designationName?: string | null;
  reportingManagerId?: number | null;
  reportingManagerName?: string | null;
  employmentTypeId?: number | null;
  employmentTypeName?: string | null;
  employmentStatusId?: number | null;
  employmentStatusName?: string | null;
  shiftId?: number | null;
  shiftName?: string | null;
  joinDate?: string | null;
  confirmationDate?: string | null;
  probationStartDate?: string | null;
  probationEndDate?: string | null;
  noticePeriodDays?: number | null;
  workMode?: string | null;
}

export interface Employee {
  id: number;
  employeeCode?: string | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  name: string;
  email: string;
  personalEmail?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  department?: string | null;
  role: string;
  status: string;
  reportingManagerId?: number | null;
  reportingManagerName?: string | null;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  joinDate?: string | null;
  birthDate?: string | null;
  createdAt?: string;
  userId?: string | null;
  initials?: string;
  employment?: EmployeeEmployment | null;
  documents?: EmployeeDocument[];
}

export interface CreateEmployeeRequest {
  employeeCode?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  name: string;
  email: string;
  personalEmail?: string | null;
  password: string;
  phone?: string | null;
  alternatePhone?: string | null;
  department?: string | null;
  departmentId?: number | null;
  role: string;
  designationId?: number | null;
  status: string;
  employmentTypeId?: number | null;
  employmentStatusId?: number | null;
  shiftId?: number | null;
  reportingManagerId?: number | null;
  photoUrl?: string | null;
  joinDate?: string | null;
  birthDate?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
}

export interface UpdateEmployeeRequest {
  employeeCode?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  name: string;
  email: string;
  personalEmail?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  department?: string | null;
  departmentId?: number | null;
  role: string;
  designationId?: number | null;
  status: string;
  employmentTypeId?: number | null;
  employmentStatusId?: number | null;
  shiftId?: number | null;
  reportingManagerId?: number | null;
  photoUrl?: string | null;
  joinDate?: string | null;
  birthDate?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
}


export interface DepartmentMember {
  id: number;
  name: string;
  role: string;
  email: string;
  photoUrl?: string | null;
}

export interface Department {
  id: number;
  name: string;
  initials: string;
  description?: string | null;
  lead?: string | null;
  color: string;
  memberCount: number;
  members: DepartmentMember[];
  createdAt?: string;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string | null;
  lead?: string | null;
  color?: string | null;
}

export interface UpdateDepartmentRequest {
  name: string;
  description?: string | null;
  lead?: string | null;
  color?: string | null;
}

export interface BreakLogItem {
  id: number;
  type: string;
  startTime: string;
  endTime?: string | null;
  durationMins: number;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string;
  date: string;
  status: 'Present' | 'Absent' | 'Half-day' | 'Late' | 'Weekend';
  checkIn?: string | null;
  checkOut?: string | null;
  breakTime?: string | null;
  breakStart?: string | null;
  breakEnd?: string | null;
  activeBreakType?: string | null;
  activeBreakStartTime?: string | null;
  isOnBreak?: boolean;
  totalBreakMinutes?: number;
  breakLogs?: string | null;
  workedHours: number;
  initials: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly baseUrl = 'http://localhost:5245/api';

  private employeesSubject = new BehaviorSubject<Employee[]>([]);
  public employees$ = this.employeesSubject.asObservable();

  private departmentsSubject = new BehaviorSubject<Department[]>([]);
  public departments$ = this.departmentsSubject.asObservable();

  private attendancesSubject = new BehaviorSubject<AttendanceRecord[]>([]);
  public attendances$ = this.attendancesSubject.asObservable();

  constructor(private http: HttpClient) {
    // Populate employees from cache initially if available
    const cached = localStorage.getItem('synaptech-employees');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.employeesSubject.next(parsed);
        }
      } catch {}
    }

    // Populate departments from cache initially if available
    const cachedDepts = localStorage.getItem('synaptech-departments');
    if (cachedDepts) {
      try {
        const parsed = JSON.parse(cachedDepts);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.departmentsSubject.next(parsed);
        }
      } catch {}
    }

    // Populate attendance from cache initially if available
    const cachedAtt = localStorage.getItem('synaptech-attendance');
    if (cachedAtt) {
      try {
        const parsed = JSON.parse(cachedAtt);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.attendancesSubject.next(parsed);
        }
      } catch {}
    }

    // Auto-fetch fresh employees from backend API
    this.loadEmployees().subscribe({
      next: () => {},
      error: (err) => console.warn('Could not auto-load employees from backend:', err)
    });

    // Auto-fetch fresh departments from backend API
    this.loadDepartments().subscribe({
      next: () => {},
      error: (err) => console.warn('Could not auto-load departments from backend:', err)
    });

    // Auto-fetch fresh attendance from backend API
    this.loadAttendance().subscribe({
      next: () => {},
      error: (err) => console.warn('Could not auto-load attendance from backend:', err)
    });
  }

  public sanitizeName(name?: string | null): string {
    if (!name) return '';
    let trimmed = name.trim();
    if (trimmed.toLowerCase().endsWith(' user') && trimmed.toLowerCase() !== 'user') {
      trimmed = trimmed.slice(0, -5).trim();
    }
    return trimmed;
  }

  // GET /api/employees and sync locally & reactively
  loadEmployees(): Observable<Employee[]> {
    return this.getEmployees().pipe(
      tap((data) => {
        const raw = Array.isArray(data) ? data : ((data as any)?.value || []);
        const nonAdmin = (raw || [])
          .filter((e: any) => e.role && e.role.toLowerCase() !== 'admin')
          .map((e: any) => ({
            ...e,
            name: this.sanitizeName(e.name),
            lastName: e.lastName?.toLowerCase() === 'user' ? '' : e.lastName
          }));
        this.employeesSubject.next(nonAdmin);
        this.syncToLocalStorage(nonAdmin);
      })
    );
  }

  get currentEmployees(): Employee[] {
    return this.employeesSubject.value;
  }

  private syncToLocalStorage(employees: Employee[]): void {
    const mapped = employees.map(emp => {
      const cleanName = this.sanitizeName(emp.name);
      return {
        id: emp.id,
        name: cleanName,
        email: emp.email,
        phone: emp.phone || '',
        department: emp.department || 'Unassigned',
        role: emp.role,
        status: emp.status || 'Present',
        initials: cleanName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
        reportingManager: emp.reportingManagerName || '—',
        photoUrl: emp.photoUrl || '',
        joinDate: emp.joinDate ? emp.joinDate.slice(0, 10) : '',
        birthDate: emp.birthDate ? emp.birthDate.slice(0, 10) : '',
        userId: emp.userId
      };
    });
    localStorage.setItem('synaptech-employees', JSON.stringify(mapped));
  }


  // GET /api/employees
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(
      `${this.baseUrl}/employees`
    );
  }

  // GET /api/employees/1
  getEmployee(id: number): Observable<Employee> {
    return this.http.get<Employee>(
      `${this.baseUrl}/employees/${id}`
    );
  }

  // POST /api/employees
  createEmployee(
    employee: CreateEmployeeRequest
  ): Observable<Employee> {
    return this.http.post<Employee>(
      `${this.baseUrl}/employees`,
      employee
    ).pipe(
      tap((newEmp) => {
        if (newEmp && newEmp.id) {
          const current = this.employeesSubject.value || [];
          const sanitized = {
            ...newEmp,
            name: this.sanitizeName(newEmp.name)
          };
          const updated = [sanitized, ...current.filter(e => e.id !== sanitized.id)];
          this.employeesSubject.next(updated);
          this.syncToLocalStorage(updated);
        } else {
          this.loadEmployees().subscribe();
        }
      })
    );
  }

  // PUT /api/employees/1
  updateEmployee(
    id: number,
    employee: UpdateEmployeeRequest
  ): Observable<Employee> {
    return this.http.put<Employee>(
      `${this.baseUrl}/employees/${id}`,
      employee
    ).pipe(
      tap((updatedEmp) => {
        if (updatedEmp && updatedEmp.id) {
          const current = this.employeesSubject.value || [];
          const idx = current.findIndex(e => e.id === updatedEmp.id);
          const sanitized = { ...updatedEmp, name: this.sanitizeName(updatedEmp.name) };
          let updated: Employee[];
          if (idx >= 0) {
            updated = [...current];
            updated[idx] = sanitized;
          } else {
            updated = [sanitized, ...current];
          }
          this.employeesSubject.next(updated);
          this.syncToLocalStorage(updated);
        } else {
          this.loadEmployees().subscribe();
        }
      })
    );
  }

  // DELETE /api/employees/1
  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/employees/${id}`
    ).pipe(
      tap(() => {
        const current = this.employeesSubject.value || [];
        const updated = current.filter(e => e.id !== id);
        this.employeesSubject.next(updated);
        this.syncToLocalStorage(updated);
      })
    );
  }

  // POST /api/Auth/reset-password
  resetEmployeePassword(employeeId: number, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Auth/reset-password`, {
      employeeId,
      newPassword
    });
  }

  // ==================================================
  // DEPARTMENTS API
  // ==================================================

  loadDepartments(): Observable<Department[]> {
    return this.getDepartments().pipe(
      tap((depts) => {
        const list = depts || [];
        this.departmentsSubject.next(list);
        this.syncDepartmentsToLocalStorage(list);
      })
    );
  }

  get currentDepartments(): Department[] {
    return this.departmentsSubject.value;
  }

  private syncDepartmentsToLocalStorage(departments: Department[]): void {
    const mapped = departments.map(d => ({
      id: d.id,
      name: d.name,
      initials: d.initials || (d.name.length >= 2 ? d.name.slice(0, 2).toUpperCase() : d.name.toUpperCase()),
      description: d.description || '',
      lead: d.lead || '',
      color: d.color || 'teal',
      memberCount: d.memberCount || (d.members ? d.members.length : 0),
      members: (d.members || []).map(m => ({
        id: m.id,
        name: m.name,
        role: m.role
      }))
    }));
    localStorage.setItem('synaptech-departments', JSON.stringify(mapped));
  }

  // GET /api/departments
  getDepartments(): Observable<Department[]> {
    return this.http.get<Department[]>(
      `${this.baseUrl}/departments`
    );
  }

  // GET /api/departments/1
  getDepartment(id: number): Observable<Department> {
    return this.http.get<Department>(
      `${this.baseUrl}/departments/${id}`
    );
  }

  // POST /api/departments
  createDepartment(dept: CreateDepartmentRequest): Observable<Department> {
    return this.http.post<Department>(
      `${this.baseUrl}/departments`,
      dept
    ).pipe(
      tap(() => {
        this.loadDepartments().subscribe();
        this.loadEmployees().subscribe();
      })
    );
  }

  // PUT /api/departments/1
  updateDepartment(id: number, dept: UpdateDepartmentRequest): Observable<Department> {
    return this.http.put<Department>(
      `${this.baseUrl}/departments/${id}`,
      dept
    ).pipe(
      tap(() => {
        this.loadDepartments().subscribe();
        this.loadEmployees().subscribe();
      })
    );
  }

  // DELETE /api/departments/1
  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/departments/${id}`
    ).pipe(
      tap(() => {
        this.loadDepartments().subscribe();
        this.loadEmployees().subscribe();
      })
    );
  }

  // POST /api/departments/1/members
  addMemberToDepartment(departmentId: number, employeeId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/departments/${departmentId}/members`,
      { employeeId }
    ).pipe(
      tap(() => {
        this.loadDepartments().subscribe();
        this.loadEmployees().subscribe();
      })
    );
  }

  // DELETE /api/departments/1/members/12
  removeMemberFromDepartment(departmentId: number, employeeId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/departments/${departmentId}/members/${employeeId}`
    ).pipe(
      tap(() => {
        this.loadDepartments().subscribe();
        this.loadEmployees().subscribe();
      })
    );
  }

  // ==================================================
  // ATTENDANCE API
  // ==================================================

  loadAttendance(date?: string): Observable<AttendanceRecord[]> {
    const url = date ? `${this.baseUrl}/attendances?date=${date}` : `${this.baseUrl}/attendances`;
    return this.http.get<AttendanceRecord[]>(url).pipe(
      tap((records) => {
        const list = records || [];
        this.attendancesSubject.next(list);
        localStorage.setItem('synaptech-attendance', JSON.stringify(list));
      })
    );
  }

  get currentAttendances(): AttendanceRecord[] {
    return this.attendancesSubject.value;
  }

  getEmployeeAttendance(employeeId: number, date?: string): Observable<AttendanceRecord[]> {
    const url = date
      ? `${this.baseUrl}/attendances/employee/${employeeId}?date=${date}`
      : `${this.baseUrl}/attendances/employee/${employeeId}`;
    return this.http.get<AttendanceRecord[]>(url);
  }

  clockIn(employeeId: number, date?: string): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.baseUrl}/attendances/clock-in`, { employeeId, date }).pipe(
      tap((record) => {
        if (record && record.id) {
          const current = this.attendancesSubject.value || [];
          const idx = current.findIndex(a => a.id === record.id || (a.employeeId === record.employeeId && a.date === record.date));
          let updated: AttendanceRecord[];
          if (idx >= 0) {
            updated = [...current];
            updated[idx] = record;
          } else {
            updated = [record, ...current];
          }
          this.attendancesSubject.next(updated);
        }
      })
    );
  }

  clockOut(employeeId: number, date?: string): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.baseUrl}/attendances/clock-out`, { employeeId, date }).pipe(
      tap((record) => {
        if (record && record.id) {
          const current = this.attendancesSubject.value || [];
          const idx = current.findIndex(a => a.id === record.id || (a.employeeId === record.employeeId && a.date === record.date));
          let updated: AttendanceRecord[];
          if (idx >= 0) {
            updated = [...current];
            updated[idx] = record;
          } else {
            updated = [record, ...current];
          }
          this.attendancesSubject.next(updated);
        }
      })
    );
  }

  toggleBreak(employeeId: number, date?: string, breakType?: string): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.baseUrl}/attendances/break`, { employeeId, date, breakType }).pipe(
      tap((record) => {
        if (record && record.id) {
          const current = this.attendancesSubject.value || [];
          const idx = current.findIndex(a => a.id === record.id || (a.employeeId === record.employeeId && a.date === record.date));
          let updated: AttendanceRecord[];
          if (idx >= 0) {
            updated = [...current];
            updated[idx] = record;
          } else {
            updated = [record, ...current];
          }
          this.attendancesSubject.next(updated);
        }
      })
    );
  }

  manualPunch(payload: { employeeId: number; date: string; checkIn?: string; checkOut?: string; breakStart?: string; breakEnd?: string; breakType?: string; reason?: string }): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.baseUrl}/attendances/manual-punch`, payload).pipe(
      tap((record) => {
        if (record && record.id) {
          const current = this.attendancesSubject.value || [];
          const idx = current.findIndex(a => a.id === record.id || (a.employeeId === record.employeeId && a.date === record.date));
          let updated: AttendanceRecord[];
          if (idx >= 0) {
            updated = [...current];
            updated[idx] = record;
          } else {
            updated = [record, ...current];
          }
          this.attendancesSubject.next(updated);
        }
      })
    );
  }

  updateAttendanceRecord(payload: { employeeId: number; date: string; status: string; checkIn?: string | null; checkOut?: string | null; workedHours?: number }): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.baseUrl}/attendances/update`, payload).pipe(
      tap(() => {
        this.loadAttendance(payload.date).subscribe();
        this.loadEmployees().subscribe();
      })
    );
  }

  markAllPresent(date?: string): Observable<any> {
    const url = date ? `${this.baseUrl}/attendances/mark-all-present?date=${date}` : `${this.baseUrl}/attendances/mark-all-present`;
    return this.http.post<any>(url, {}).pipe(
      tap(() => {
        this.loadAttendance(date).subscribe();
        this.loadEmployees().subscribe();
      })
    );
  }

  getMonthlyAttendance(month?: string): Observable<AttendanceRecord[]> {
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    return this.http.get<AttendanceRecord[]>(`${this.baseUrl}/attendances/monthly?month=${targetMonth}`);
  }

  // ==================================================
  // MASTER TABLES & DOCUMENTS API
  // ==================================================

  getDesignations(): Observable<Designation[]> {
    return this.http.get<Designation[]>(`${this.baseUrl}/designations`);
  }

  getEmploymentTypes(): Observable<EmploymentType[]> {
    return this.http.get<EmploymentType[]>(`${this.baseUrl}/employmenttypes`);
  }

  getEmploymentStatuses(): Observable<EmploymentStatus[]> {
    return this.http.get<EmploymentStatus[]>(`${this.baseUrl}/employmentstatuses`);
  }

  getShifts(): Observable<Shift[]> {
    return this.http.get<Shift[]>(`${this.baseUrl}/shifts`);
  }

  // ==================================================
  // LEAVE REQUESTS API
  // ==================================================

  getLeaveRequests(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(`${this.baseUrl}/leaverequests`);
  }

  createLeaveRequest(req: CreateLeaveRequest): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.baseUrl}/leaverequests`, req);
  }

  updateLeaveStatus(id: number, status: string, approvedBy?: string): Observable<LeaveRequest> {
    return this.http.put<LeaveRequest>(`${this.baseUrl}/leaverequests/${id}/status`, { status, approvedBy });
  }

  getEmployeeDocuments(employeeId: number): Observable<EmployeeDocument[]> {
    return this.http.get<EmployeeDocument[]>(`${this.baseUrl}/employees/${employeeId}/documents`);
  }

  createEmployeeDocument(employeeId: number, doc: CreateEmployeeDocumentRequest): Observable<EmployeeDocument> {
    return this.http.post<EmployeeDocument>(`${this.baseUrl}/employees/${employeeId}/documents`, doc);
  }

  deleteEmployeeDocument(documentId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/employeedocuments/${documentId}`);
  }

  // ==================================================
  // CHAT API
  // ==================================================

  getChatUsers(): Observable<UserChatProfile[]> {
    return this.http.get<UserChatProfile[]>(`${this.baseUrl}/chat/users`);
  }

  getChatChannels(userId: string): Observable<ChatChannel[]> {
    return this.http.get<ChatChannel[]>(`${this.baseUrl}/chat/channels?userId=${encodeURIComponent(userId)}`);
  }

  getChannelMessages(channelId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.baseUrl}/chat/channels/${channelId}/messages`);
  }

  createDirectChat(currentUserId: string, targetUserId: string): Observable<ChatChannel> {
    return this.http.post<ChatChannel>(`${this.baseUrl}/chat/channels/direct?currentUserId=${encodeURIComponent(currentUserId)}`, { targetUserId });
  }

  createGroupChat(currentUserId: string, groupName: string, memberUserIds: string[]): Observable<ChatChannel> {
    return this.http.post<ChatChannel>(`${this.baseUrl}/chat/channels/group?currentUserId=${encodeURIComponent(currentUserId)}`, { groupName, memberUserIds });
  }

  sendChatMessage(channelId: number, content: string, senderUserId: string, senderName: string): Observable<ChatMessage> {
    const url = `${this.baseUrl}/chat/messages?senderUserId=${encodeURIComponent(senderUserId)}&senderName=${encodeURIComponent(senderName)}`;
    return this.http.post<ChatMessage>(url, { channelId, content });
  }
}

export interface UserChatProfile {
  userId: string;
  employeeId: number;
  fullName: string;
  email: string;
  department?: string;
  designation?: string;
  role?: string;
  isAdmin?: boolean;
  isOnline?: boolean;
}

export interface ChatChannel {
  id: number;
  name?: string;
  type: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  members: UserChatProfile[];
}

export interface ChatMessage {
  id: number;
  channelId: number;
  senderUserId: string;
  senderName: string;
  isSenderAdmin?: boolean;
  content: string;
  sentAt: string;
  isDelivered?: boolean;
  isRead?: boolean;
  readAt?: string;
}

