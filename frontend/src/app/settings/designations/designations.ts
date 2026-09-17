import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ErpPage } from '../../shared/erp-page/erp-page';
import { ApiService, Designation as ApiDesignation, Department, Employee } from '../../services/api.service';

export interface DesignationDisplayItem {
  id: number;
  title: string;
  code: string;
  department: string;
  count: number;
  assignedEmployeesCount: number;
  status: string;
}

export interface DepartmentGroup {
  name: string;
  initials: string;
  color: string;
  icon: string;
  designations: DesignationDisplayItem[];
  totalDesignations: number;
  totalEmployees: number;
}

@Component({
  selector: 'app-designations',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './designations.html',
  styleUrl: './designations.css'
})
export class Designations implements OnInit {
  designationItems: DesignationDisplayItem[] = [];
  rawDepartments: Department[] = [];
  rawEmployees: Employee[] = [];
  departments: string[] = [];

  newTitle = '';
  newDept = '';
  newCode = '';
  newCount = 1;
  searchQuery = '';
  selectedDeptFilter = 'All';
  savedMsg = '';
  showAddForm = false;
  loading = true;
  viewMode: 'department' | 'grid' = 'department';

  private readonly deptColors: Record<string, string> = {
    'Developer': 'emerald',
    'Engineering': 'emerald',
    'Software': 'emerald',
    'HR': 'rose',
    'Human Resources': 'rose',
    'Finance': 'amber',
    'Accounts': 'amber',
    'Sales': 'sky',
    'Marketing': 'purple',
    'Operations': 'indigo',
    'Management': 'teal',
    'General': 'slate'
  };

  private readonly deptIcons: Record<string, string> = {
    'Developer': '💻',
    'Engineering': '⚙️',
    'Software': '🚀',
    'HR': '👥',
    'Human Resources': '👥',
    'Finance': '💰',
    'Accounts': '📊',
    'Sales': '📈',
    'Marketing': '📢',
    'Operations': '🛠️',
    'Management': '👑',
    'General': '🏷️'
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    // 1. Instant sync initialization from ApiService memory/cache
    const cachedDepts = this.api.currentDepartments;
    const cachedEmps = this.api.currentEmployees;
    if (cachedDepts && cachedDepts.length > 0) {
      this.rawDepartments = cachedDepts;
      this.departments = cachedDepts.map(d => d.name);
      this.newDept = this.departments[0] || '';
      this.loading = false;
    }

    // 2. Fetch fresh parallel data from API
    this.loadData();
  }

  loadData(): void {
    if (this.designationItems.length === 0) {
      this.loading = true;
    }

    forkJoin({
      depts: this.api.getDepartments().pipe(catchError(() => of(this.api.currentDepartments || []))),
      desigs: this.api.getDesignations().pipe(catchError(() => of([]))),
      emps: this.api.getEmployees().pipe(catchError(() => of(this.api.currentEmployees || [])))
    }).subscribe({
      next: ({ depts, desigs, emps }) => {
        this.rawDepartments = depts || [];
        this.rawEmployees = emps || [];
        this.departments = Array.from(new Set((depts || []).map(d => d.name)));

        if (this.departments.length > 0 && !this.newDept) {
          this.newDept = this.departments[0];
        }

        this.buildDisplayItems(desigs || [], depts || [], emps || []);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load designation data:', err);
        this.loading = false;
      }
    });
  }

  private buildDisplayItems(desigs: ApiDesignation[], depts: Department[], emps: Employee[]): void {
    this.designationItems = desigs.map(des => {
      let deptName = 'General';
      const matchedDept = depts.find(d =>
        d.designations?.some(dd => dd.id === des.id || dd.name.toLowerCase() === des.name.toLowerCase())
      );

      if (matchedDept) {
        deptName = matchedDept.name;
      } else {
        const nameLower = des.name.toLowerCase();
        if (nameLower.includes('dev') || nameLower.includes('engineer') || nameLower.includes('software') || nameLower.includes('qa') || nameLower.includes('data')) {
          deptName = 'Developer';
        } else if (nameLower.includes('hr') || nameLower.includes('recruiter') || nameLower.includes('talent')) {
          deptName = 'HR';
        } else if (nameLower.includes('finance') || nameLower.includes('account') || nameLower.includes('cfo')) {
          deptName = 'Finance';
        } else if (nameLower.includes('sales') || nameLower.includes('business') || nameLower.includes('account mgr')) {
          deptName = 'Sales';
        } else if (nameLower.includes('marketing') || nameLower.includes('content') || nameLower.includes('seo') || nameLower.includes('brand')) {
          deptName = 'Marketing';
        } else if (nameLower.includes('ops') || nameLower.includes('operation') || nameLower.includes('support') || nameLower.includes('admin')) {
          deptName = 'Operations';
        } else if (nameLower.includes('lead') || nameLower.includes('head') || nameLower.includes('director') || nameLower.includes('chief') || nameLower.includes('president')) {
          deptName = 'Management';
        }
      }

      // Count actual assigned employees for this designation
      const assignedEmpsCount = emps.filter(e => {
        const empDesig = (e.designation || e.employment?.designationName || '').toLowerCase();
        return empDesig === des.name.toLowerCase();
      }).length;

      return {
        id: des.id,
        title: des.name,
        code: des.code || des.name.replace(/\s+/g, '_').toUpperCase(),
        department: deptName,
        count: 1,
        assignedEmployeesCount: assignedEmpsCount,
        status: des.status || 'Active'
      };
    });
  }

  get totalDesignationsCount(): number {
    return this.designationItems.length;
  }

  get uniqueDepartmentsCount(): number {
    return new Set(this.designationItems.map(d => d.department)).size;
  }

  get totalMembersCount(): number {
    return this.designationItems.reduce((acc, curr) => acc + curr.assignedEmployeesCount, 0);
  }

  get filteredDesignations(): DesignationDisplayItem[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.designationItems.filter(des => {
      const matchesSearch = !q || des.title.toLowerCase().includes(q) ||
                            des.department.toLowerCase().includes(q) ||
                            des.code.toLowerCase().includes(q);
      const matchesDept = this.selectedDeptFilter === 'All' || des.department.toLowerCase() === this.selectedDeptFilter.toLowerCase();
      return matchesSearch && matchesDept;
    });
  }

  get groupedDepartments(): DepartmentGroup[] {
    const filtered = this.filteredDesignations;
    const groupMap = new Map<string, DesignationDisplayItem[]>();

    // Collect all departments from current list + filtered designations
    filtered.forEach(des => {
      const deptKey = des.department || 'General';
      if (!groupMap.has(deptKey)) {
        groupMap.set(deptKey, []);
      }
      groupMap.get(deptKey)!.push(des);
    });

    const groups: DepartmentGroup[] = [];
    groupMap.forEach((desigList, deptName) => {
      const initials = deptName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'DP';
      const color = this.deptColors[deptName] || 'teal';
      const icon = this.deptIcons[deptName] || '🏢';
      const totalEmps = desigList.reduce((acc, d) => acc + d.assignedEmployeesCount, 0);

      groups.push({
        name: deptName,
        initials,
        color,
        icon,
        designations: desigList,
        totalDesignations: desigList.length,
        totalEmployees: totalEmps
      });
    });

    return groups.sort((a, b) => b.totalDesignations - a.totalDesignations);
  }

  addDesignation(): void {
    if (!this.newTitle.trim()) return;

    const targetDeptName = this.newDept || (this.departments.length > 0 ? this.departments[0] : 'General');
    const deptObj = this.rawDepartments.find(d => d.name.toLowerCase() === targetDeptName.toLowerCase());
    const rawCode = this.newTitle.replace(/ /g, '_').replace(/\//g, '_').toUpperCase();
    const code = rawCode.length > 20 ? rawCode.slice(0, 20) : rawCode;

    this.api.createDesignation({
      name: this.newTitle.trim(),
      code: code,
      description: `${this.newTitle.trim()} position`,
      status: 'Active'
    }).subscribe({
      next: (created) => {
        if (deptObj && created?.id) {
          this.api.addDesignationToDepartment(deptObj.id, created.id).subscribe({
            next: () => this.loadData()
          });
        } else {
          this.loadData();
        }
        this.newTitle = '';
        this.showAddForm = false;
        this.savedMsg = 'Designation added successfully!';
        setTimeout(() => this.savedMsg = '', 3000);
      },
      error: (err) => {
        console.error('Failed to create designation:', err);
        this.savedMsg = err?.error?.message || 'Failed to create designation.';
        setTimeout(() => this.savedMsg = '', 3000);
      }
    });
  }

  deleteDesignation(id: number): void {
    this.api.deleteDesignation(id).subscribe({
      next: () => {
        this.designationItems = this.designationItems.filter(d => d.id !== id);
        this.savedMsg = 'Designation removed from database.';
        setTimeout(() => this.savedMsg = '', 2500);
      },
      error: (err) => {
        console.error('Failed to delete designation:', err);
        this.savedMsg = 'Failed to remove designation.';
        setTimeout(() => this.savedMsg = '', 2500);
      }
    });
  }
}
