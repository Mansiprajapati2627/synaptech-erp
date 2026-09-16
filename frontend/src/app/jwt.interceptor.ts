import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Auto-refresh access token on 401 Unauthorized for standard API requests
      if (
        error.status === 401 &&
        !req.url.includes('/Auth/login') &&
        !req.url.includes('/Auth/refresh-token')
      ) {
        return authService.refreshToken().pipe(
          switchMap((newTokenObj) => {
            if (newTokenObj && newTokenObj.token) {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newTokenObj.token}`
                }
              });
              return next(retryReq);
            }
            authService.logout();
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
