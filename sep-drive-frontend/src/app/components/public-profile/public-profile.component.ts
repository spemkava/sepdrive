// src/app/components/public-profile/public-profile.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { UserProfile } from '../../models/user-profile.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './public-profile.component.html',
  styleUrls: ['../profile/profile.component.scss']
})

export class PublicProfileComponent implements OnInit {
  profile$!: Observable<UserProfile>;
  constructor(
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit() {
    const username = this.route.snapshot.paramMap.get('username')!;
    this.profile$ = this.userService.getUserProfile(username);
  }
}
