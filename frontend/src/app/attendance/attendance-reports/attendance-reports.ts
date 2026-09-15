import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-attendance-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './attendance-reports.html',
  styleUrl: './attendance-reports.css'
})
export class AttendanceReports {
  selectedMonth = new Date().toISOString().slice(0, 7);
  downloading = false;

  constructor(private api: ApiService) {}

  downloadMonthlyReport(): void {
    if (this.downloading) return;
    this.downloading = true;
    this.api.getMonthlyAttendance(this.selectedMonth).subscribe({
      next: (records) => {
        this.downloading = false;
        const raw = Array.isArray(records) ? records : ((records as any)?.value || []);
        const headers = ['Date', 'Employee ID', 'Employee Name', 'Department', 'Status', 'Check-In', 'Check-Out', 'Worked Hours'];
        const rows = raw.map((r: any) => [r.date, r.employeeId, `"${r.employeeName || ''}"`, `"${r.department || 'Unassigned'}"`, r.status, r.checkIn || '--', r.checkOut || '--', r.workedHours || 0]);
        const csvContent = [headers.join(','), ...rows.map((row: any[]) => row.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance-report-${this.selectedMonth}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.downloading = false
    });
  }
}
