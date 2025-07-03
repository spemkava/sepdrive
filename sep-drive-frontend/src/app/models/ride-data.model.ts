export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RideData {
  currentStep: number;
  status: string;
  route: Coordinate[];
  // Weitere Felder können hier hinzugefügt werden
}
