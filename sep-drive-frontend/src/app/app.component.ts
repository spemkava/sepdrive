import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterLink} from '@angular/router'; // RouterLink entfernt
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { UserProfile } from './models/user-profile.model';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet

  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  currentYear = new Date().getFullYear();
  isMenuOpen = false;

  backendUrl = 'http://localhost:8080';
  defaultProfilePic = 'assets/default-profile.png';
  profileImageUrl: string = this.defaultProfilePic;
  profile: UserProfile | null = null;

  constructor(
    public authService: AuthService,
    public router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.userService.getMyProfile().subscribe((profile: UserProfile) => {
        this.profile = profile;
      });
      this.userService.refreshProfile();
    }
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    window.location.reload();
  }

  getProfileImageUrl(): string {
    const url = localStorage.getItem('profileImageUrl');
    return url ? url : 'assets/default-profile.png';
  }
  onLogoClick(): void {
    // Beispiel: Wenn das Seitenmenü geöffnet ist, schließe es
    if (this.isMenuOpen) {
      this.toggleMenu();
    }
  }

  goHome() {
    this.router.navigateByUrl('/home', { skipLocationChange: false }).then(() => {

    });
  }
}
