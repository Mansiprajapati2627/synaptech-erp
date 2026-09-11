import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  role: string;
  status: string;
  reportingManagerId?: number | null;
  reportingManagerName?: string | null;
  photoUrl?: string | null;
  joinDate?: string | null;
  birthDate?: string | null;
  createdAt?: string;
  userId?: string | null;
  initials?: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  department?: string | null;
  role: string;
  status: string;
  reportingManagerId?: number | null;
  photoUrl?: string | null;
  joinDate?: string | null;
  birthDate?: string | null;
}

export interface UpdateEmployeeRequest {
  name: string;
  email: string;
  phone?: string | null;
  department?: string | null;
  role: string;
  status: string;
  reportingManagerId?: number | null;
  photoUrl?: string | null;
  joinDate?: string | null;
  birthDate?: string | null;
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

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly baseUrl = 'http://localhost:5245/api';

  private employeesSubject = new BehaviorSubject<Employee[]>([]);
  public employees$ = this.employeesSubject.asObservable();

  private departmentsSubject = new BehaviorSubject<Department[]>([]);
  public departments$ = this.departmentsSubject.asObservable();

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
  }

  // GET /api/employees and sync locally & reactively
  loadEmployees(): Observable<Employee[]> {
    return this.getEmployees().pipe(
      tap((employees) => {
        const nonAdmin = (employees || []).filter(e => e.role && e.role.toLowerCase() !== 'admin');
        this.employeesSubject.next(nonAdmin);
        this.syncToLocalStorage(nonAdmin);
      })
    );
  }

  get currentEmployees(): Employee[] {
    return this.employeesSubject.value;
  }

  private syncToLocalStorage(employees: Employee[]): void {
    const mapped = employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      department: emp.department || 'Unassigned',
      role: emp.role,
      status: emp.status || 'Present',
      initials: emp.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase(),
      reportingManager: emp.reportingManagerName || '—',
      photoUrl: emp.photoUrl || '',
      joinDate: emp.joinDate ? emp.joinDate.slice(0, 10) : '',
      birthDate: emp.birthDate ? emp.birthDate.slice(0, 10) : '',
      userId: emp.userId
    }));
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
      tap(() => this.loadEmployees().subscribe())
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
      tap(() => this.loadEmployees().subscribe())
    );
  }

  // DELETE /api/employees/1
  deleteEmployee(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/employees/${id}`
    ).pipe(
      tap(() => this.loadEmployees().subscribe())
    );
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
}