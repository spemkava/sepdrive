import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter }                           from '@angular/router';
import { provideHttpClient, withInterceptors }     from '@angular/common/http';
import { FormsModule, ReactiveFormsModule }         from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes }          from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
  provideRouter(routes), provideAnimations(),
  provideHttpClient(withInterceptors([ authInterceptor ])),
  importProvidersFrom(
    FormsModule,            // für [(ngModel)]
    ReactiveFormsModule)   // für FormBuilder/FormGroup

  ]
};
