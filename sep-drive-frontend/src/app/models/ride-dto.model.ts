export interface RideDtoModel {
  id: number;
  customerId: number;
  customerName?: string;
  driverId: number;
  driverName?: string;
  startLatitude: number;
  startLongitude: number;
  startAddress?: string;
  destinationLatitude: number;
  destinationLongitude: number;
  destinationAddress?: string;
  carClassName: string;
  status: string;
  startedAt: string;
  route: { lat: number; lng: number }[];
  distance: number;
  price: number;
}
