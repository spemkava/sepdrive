import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';



export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);

    const token = localStorage.getItem('authToken');


    //Token vorhanden?
    if(token) {
      return true;
    }else {
      console.error('Unauthorized');
      router.navigate(['/login']);
      return false;
    }
  }

