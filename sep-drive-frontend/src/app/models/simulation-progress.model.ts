export interface SimulationProgress {
  rideId: number;
  currentIndex: number;
  lat: number;
  lon: number;
  isFinished: boolean;
  isRunning: boolean;
  elapsedMs: number;
}
