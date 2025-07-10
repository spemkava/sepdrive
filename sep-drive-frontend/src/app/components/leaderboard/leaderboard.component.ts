import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {UserProfile} from '../../models/user-profile.model';
import {LeaderboardService} from '../../services/Leaderboard.service';
import {forkJoin} from 'rxjs';

@Component({
  selector: 'leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.scss']
})

export class LeaderboardComponent implements OnInit {

  driverList: UserProfile[] = []
  leaderboardInfos: {
    driverUsername: string
    driverFirstName: string
    driverLastName: string
    totalDistance: number
    totalAvgRating: number
    totalDrivingTime: number
    totalRides: number
    totalMoney: number
  }[] = []

  sortColumn: string = ''
  searchTerm: string= ''
  currentUserName: string | null = ''
  sortDirectionAsc: boolean = true
  filteredList = this.leaderboardInfos

  constructor(private leaderBoardService: LeaderboardService) { }

  ngOnInit() {
    const userNameFromStorage = localStorage.getItem('username')
    if (userNameFromStorage) {
      this.currentUserName = userNameFromStorage
    }
    this.loadLeaderboard()
  }

  loadLeaderboard() {
    this.leaderBoardService.getDrivers().subscribe({
      next: (drivers) => {
        this.driverList = drivers

        const request = drivers.map((driver) => {
          return forkJoin([
            this.leaderBoardService.getTotalDistance(driver.id),
            this.leaderBoardService.getTotalAvgRating(driver.id),
            this.leaderBoardService.getTotalDrivingTime(driver.id),
            this.leaderBoardService.getTotalRides(driver.id),
            this.leaderBoardService.getTotalMoney(driver.id),
          ]).pipe();
        });

        forkJoin(request).subscribe({
          next: (results) => {
            this.leaderboardInfos = drivers.map((driver, index) => {
              const [distance, avgRating, drivingTime, rides, money] = results[index]
              return {
                driverUsername: driver.username,
                driverFirstName: driver.firstName,
                driverLastName: driver.lastName,
                totalDistance: distance,
                totalAvgRating: avgRating,
                totalDrivingTime: drivingTime,
                totalRides: rides,
                totalMoney: money
              }
            })
            this.filteredList = [...this.leaderboardInfos]
          },
          error: (err) => console.error('Fehler beim Abrufen der Daten', err)
        })

      },
      error: (err) => console.error('Fehler beim Laden der Fahrer', err)
    })
  }

  sortTable(column: string) {
    if (this.sortColumn === column) {
      this.sortDirectionAsc = !this.sortDirectionAsc
    } else {
      this.sortColumn = column
      this.sortDirectionAsc = true
    }

    this.filteredList.sort((a, b) => {
      const valA = this.getValue(a, column)
      const valB = this.getValue(b, column)

      if (valA == null) return 1
      if (valB == null) return -1

      if (typeof valA === 'string' && typeof valB === 'string') {
        return this.sortDirectionAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }  else {
        return this.sortDirectionAsc ? valA - valB : valB - valA
      }
    })
  }

  private getValue(obj: any, key: string): any {
    switch (key) {
      case 'driverName':
        return `${obj.driverFirstName} ${obj.driverLastName}`
      default:
        return obj[key]
    }
  }

  applyFilters() {
    const term = this.searchTerm.toLowerCase()

    if (!term) {
      this.filteredList = this.leaderboardInfos
      return
    }
    this.filteredList = this.leaderboardInfos.filter( ride => {
      return ride.driverUsername.toLowerCase().startsWith(term) ||
        ride.driverFirstName.toLowerCase().startsWith(term) ||
        ride.driverLastName.toLowerCase().startsWith(term)
    })
  }
}
