import { CarClass } from './enums.model';

export interface StopLocationDto {
  latitude: number;
  longitude: number;
  address?: string;
}

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
  stops?: StopLocationDto[];
}
