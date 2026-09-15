// src/app/role.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, PageKey } from './auth.service';

export const roleGuard = (requiredRoles?: string[], page?: PageKey) => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.user;

    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    // 🔥 If page key is provided, check permissions dynamically
    if (page) {
      if (!auth.canAccess(page)) {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    }

    // Fallback for role-based checks (backward compatibility)
    if (requiredRoles && requiredRoles.length > 0) {
      if (!auth.hasRole(requiredRoles as any)) {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    }

    return true;
  };
};