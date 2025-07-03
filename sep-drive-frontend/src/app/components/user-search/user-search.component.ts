import {Component, NgModule} from '@angular/core';
import {UserService} from '../../services/user.service';
import {FormsModule} from '@angular/forms';
import {UserProfile} from '../../models/user-profile.model';
import {NgForOf, NgIf} from '@angular/common';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-user-search',
  imports: [
    FormsModule,
    NgForOf,
    NgIf,
    RouterLink
  ],
  templateUrl: './user-search.component.html',
  styleUrls: ['./user-search.component.scss']
})

export class UserSearchComponent {
  query = '';
  result : UserProfile[] = [];

  constructor(private userService: UserService) {}

  search() {
    this.userService.searchUsers(this.query).subscribe(users => {
      this.result = users;
    });
  }
}
