import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErpPage } from '../../shared/erp-page/erp-page';

@Component({
  selector: 'app-leave-reports',
  standalone: true,
  imports: [CommonModule, ErpPage],
  templateUrl: './leave-reports.html',
  styleUrl: './leave-reports.css'
})
export class LeaveReports {}
