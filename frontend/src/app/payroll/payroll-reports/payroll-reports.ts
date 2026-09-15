import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-payroll-reports',
  standalone: true,
  imports: [CommonModule, ErpPage],
  templateUrl: './payroll-reports.html',
  styleUrl: './payroll-reports.css'
})
export class PayrollReports {}
