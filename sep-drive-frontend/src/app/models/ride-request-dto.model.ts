import { CarClass, RideStatus } from './enums.model';

export interface StopLocationDto {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface RideRequestDto {
  id: number;
  customerId: number;
  customerUsername: string;
  customerProfileRating: number;
  customerRating: number;
  driverRating: number;
  startLatitude: number;
  startLongitude: number;
  startAddress?: string;
  destinationLatitude: number;
  destinationLongitude: number;
  destinationAddress?: string;
  requestedCarClass: CarClass;
  totalDistance: number;
  totalTime: number;
  price: number;
  status: RideStatus;
  stops?: StopLocationDto[];

  offers?: {id:number, driverName:string, driverRating:number, driverTotalRides: number}[];
  createdAt: string; // Kommt als ISO String vom Backend (Instant)
  completedAt:string;
}
