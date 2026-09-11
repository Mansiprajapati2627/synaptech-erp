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

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly baseUrl = 'http://localhost:5245/api';

  private employeesSubject = new BehaviorSubject<Employee[]>([]);
  public employees$ = this.employeesSubject.asObservable();

  constructor(private http: HttpClient) {
    // Populate from cache initially if available
    const cached = localStorage.getItem('synaptech-employees');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.employeesSubject.next(parsed);
        }
      } catch {}
    }

    // Auto-fetch fresh from backend API
    this.loadEmployees().subscribe({
      next: () => {},
      error: (err) => console.warn('Could not auto-load employees from backend:', err)
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
}