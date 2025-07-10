import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {RideHistoryService} from '../../services/RideHistory.service';
import {RideRequestDto} from '../../models/ride-request-dto.model';
import {UserService} from '../../services/user.service';

@Component({
  selector: 'drivingHistory',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  templateUrl: './drivingHistory.component.html',
  styleUrls: ['./drivingHistory.component.scss']
})

export class DrivingHistoryComponent implements OnInit {

  rideRequest: RideRequestDto[] = []
  drivingHistory: {
    id: number
    completedAt: string
    totalDistance: number
    totalTime: number
    price: number
    customerUsername: string
    customerFirstName: string
    customerLastName: string
    customerRating: number
    driverUsername: string
    driverFirstName: string
    driverLastName: string
    driverRating: number
  }[] = []
  sortColumn: string = ''
  sortDirectionAsc: boolean = true

  constructor(private rideHistoryService: RideHistoryService, private userService: UserService) { }

  searchTerm: string = ''

  filteredHistory = this.drivingHistory

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.rideHistoryService.getCompleted().subscribe({
      next: (rides) => {
        this.rideRequest = rides;
        const tempHistory: any[] = [];

        let completedCalls = 0;
        rides.forEach(request => {
          this.userService.getUserProfile(request.customerUsername).subscribe(customer => {
            const driverUsername = request.offers?.[0]?.driverName;
            if (driverUsername) {
              this.userService.getUserProfile(driverUsername).subscribe(driver => {
                tempHistory.push({
                  id: request.id,
                  completedAt: request.completedAt,
                  totalDistance: request.totalDistance,
                  totalTime: request.totalTime,
                  price: request.price,
                  customerUsername: customer.username,
                  customerFirstName: customer.firstName,
                  customerLastName: customer.lastName,
                  driverUsername: driver.username,
                  driverFirstName: driver.firstName,
                  driverLastName: driver.lastName,
                  driverRating: request.driverRating,
                  customerRating: request.customerRating
                });
                completedCalls++;
                if (completedCalls === rides.length) {
                  this.drivingHistory = tempHistory;
                  this.filteredHistory = [...this.drivingHistory];
                }
              });
            } else {
              tempHistory.push({
                id: request.id,
                completedAt: '',
                totalDistance: request.totalDistance,
                totalTime: request.totalTime,
                price: request.price,
                customerUsername: customer.username,
                customerFirstName: customer.firstName,
                customerLastName: customer.lastName,
                driverUsername: '',
                driverFirstName: '',
                driverLastName: '',
                driverRating: 0,
                customerRating: 0
              });
              completedCalls++;
              if (completedCalls === rides.length) {
                this.drivingHistory = tempHistory;
                this.filteredHistory = [...this.drivingHistory];
              }
            }
          });
        });
      },
      error: (err) => {
        console.error('Fehler beim laden der Historie', err);
      }
    });
  }
  sortTable(column: string) {
    if (this.sortColumn === column) {
      this.sortDirectionAsc = !this.sortDirectionAsc
    } else {
      this.sortColumn = column
      this.sortDirectionAsc = true
    }

    this.filteredHistory.sort((a, b) => {
      const valA = this.getValue(a, column)
      const valB = this.getValue(b, column)

      if (valA == null) return 1
      if (valB == null) return -1

      if (typeof valA === 'string' && typeof valB === 'string') {
        return this.sortDirectionAsc ? valA.localeCompare(valB) : valB.localeCompare(valA)
      } else if (valA instanceof Date && valB instanceof Date) {
        return this.sortDirectionAsc ? valA.getTime() - valB.getTime() : valB.getTime() - valA.getTime()
      } else {
        return this.sortDirectionAsc ? valA - valB : valB - valA
      }
    })
  }

  private getValue(obj: any, key: string): any {
    switch (key) {
      case 'customerName':
        return `${obj.customerFirstName} ${obj.customerLastName}`
      case 'driverName':
        return `${obj.driverFirstName} ${obj.driverLastName}`
      case 'completedAt':
        return obj.completedAt ? new Date(obj.completedAt) : null
      default:
        return obj[key]
    }
  }

  applyFilters() {
    const term = this.searchTerm.toLowerCase()

    if (!term) {
      this.filteredHistory = this.drivingHistory
      return
    }
    this.filteredHistory = this.drivingHistory.filter( ride => {
      return ride.customerUsername.toLowerCase().startsWith(term) ||
        ride.customerFirstName.toLowerCase().startsWith(term) ||
        ride.customerLastName.toLowerCase().startsWith(term) ||
        ride.driverUsername.toLowerCase().startsWith(term) ||
        ride.driverFirstName.toLowerCase().startsWith(term) ||
        ride.driverLastName.toLowerCase().startsWith(term)
    })
  }
}

