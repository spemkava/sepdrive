import { CarClass } from './enums.model';

export interface CreateRideRequestDto {
  startLatitude?: number;
  startLongitude?: number;
  startAddress?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  destinationAddress?: string;
  requestedCarClass?: CarClass;
  totalDistance?: number;
  totalTime?: number;
  price?: number;
}
