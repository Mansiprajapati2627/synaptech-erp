// src/app/app.ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router'; // ✅ import Router
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'synaptech-erp';
  isSidebarOpen = false;

  constructor(public auth: AuthService, private router: Router) {} // ✅ inject Router

  get isLoggedIn(): boolean { return this.auth.isLoggedIn(); }
  get user() { return this.auth.user; }

  // ✅ Only show sidebar if logged in AND not on auth pages
  get showSidebar(): boolean {
    const currentUrl = this.router.url;
    const authPages = ['/login', '/signup'];
    return this.isLoggedIn && !authPages.includes(currentUrl);
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