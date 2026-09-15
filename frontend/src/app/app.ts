// src/app/app.ts
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from './auth.service';
import { filter } from 'rxjs';

import { ChatWidgetComponent } from './chat/chat-widget.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ChatWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'synaptech-erp';
  isSidebarOpen = false;

  // Track expanded parent menus
  expandedMenus: Record<string, boolean> = {
    people: true,
    attendance: true,
    leave: true,
    payroll: true,
    tasks: true,
    settings: true
  };

  // 🔥 Track current URL as a signal (reactive)
  private currentUrl = signal<string>('/');
  private router = inject(Router);
  public auth = inject(AuthService);

  constructor() {
    // Initialize with current URL
    this.currentUrl.set(this.router.url);

    // Update on every navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });
  }

  get isLoggedIn(): boolean { return this.auth.isLoggedIn(); }
  get user() { return this.auth.user; }
  get role() { return this.auth.role || 'Employee'; }

  // Show sidebar only when logged in AND not on auth pages
  get showSidebar(): boolean {
    const url = this.currentUrl();
    const isAuthPage = url === '/' || url.startsWith('/login') || url.startsWith('/signup');
    return this.isLoggedIn && !isAuthPage;
  }

  toggleMenu(menuKey: string): void {
    this.expandedMenus[menuKey] = !this.expandedMenus[menuKey];
  }

  isMenuExpanded(menuKey: string): boolean {
    return this.expandedMenus[menuKey] !== false;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  logout(): void {
    this.auth.logout();
  }
}