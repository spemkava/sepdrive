import { CarClass, RideStatus } from './enums.model';

export interface RideRequestDto {
  id: number;
  customerId: number;
  customerUsername: string;
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

  offers?: {id:number, driverName:string, driverRating:number, driverTotalRides: number}[];
  createdAt: string; // Kommt als ISO String vom Backend (Instant)
}
