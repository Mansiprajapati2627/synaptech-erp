// src/app/roles/roles.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, RoleItem } from '../services/api.service';
import { ErpPage } from '../shared/erp-page/erp-page';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, ErpPage],
  templateUrl: './roles.html',
  styleUrl: './roles.css'
})
export class Roles implements OnInit {
  roles: RoleItem[] = [
    { id: '1', name: 'Admin', isSystem: true, userCount: 0 },
    { id: '2', name: 'Staff', isSystem: true, userCount: 0 },
    { id: '3', name: 'HR', isSystem: true, userCount: 0 },
    { id: '4', name: 'Manager', isSystem: true, userCount: 0 }
  ];
  isLoading = false;
  searchTerm = '';

  // Add Role Modal State
  showModal = false;
  newRoleName = '';
  newRoleDescription = '';
  isSaving = false;
  modalError = '';

  toastMsg = '';

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.api.getRoles().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.roles = data;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  get filteredRoles(): RoleItem[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return this.roles;
    return this.roles.filter(r => 
      r.name.toLowerCase().includes(q) || 
      (r.description && r.description.toLowerCase().includes(q))
    );
  }

  openAddModal(): void {
    this.newRoleName = '';
    this.newRoleDescription = '';
    this.modalError = '';
    this.showModal = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.modalError = '';
    document.body.style.overflow = '';
    this.cdr.detectChanges();
  }

  saveRole(): void {
    const name = this.newRoleName.trim();
    if (!name) {
      this.modalError = 'Role name is required.';
      this.cdr.detectChanges();
      return;
    }

    // Check if role name already exists locally
    if (this.roles.some(r => r.name.toLowerCase() === name.toLowerCase())) {
      this.modalError = `Role "${name}" already exists.`;
      this.cdr.detectChanges();
      return;
    }

    this.isSaving = true;
    this.modalError = '';
    this.cdr.detectChanges();

    this.api.createRole({ name, description: this.newRoleDescription.trim() }).subscribe({
      next: (created) => {
        this.roles.push(created);
        this.isSaving = false;
        this.closeModal();
        this.showToast(`Role "${name}" created successfully!`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSaving = false;
        const msg = err?.error?.message || 'Failed to create role. Please try again.';
        this.modalError = msg;
        this.cdr.detectChanges();
      }
    });
  }

  deleteRole(role: RoleItem): void {
    if (role.isSystem) {
      this.showToast('System roles cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      return;
    }

    this.api.deleteRole(role.id).subscribe({
      next: () => {
        this.roles = this.roles.filter(r => r.id !== role.id);
        this.showToast(`Role "${role.name}" deleted successfully.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Failed to delete role.';
        this.showToast(msg);
        this.cdr.detectChanges();
      }
    });
  }

  showToast(msg: string): void {
    this.toastMsg = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      if (this.toastMsg === msg) {
        this.toastMsg = '';
        this.cdr.detectChanges();
      }
    }, 3500);
  }
}
