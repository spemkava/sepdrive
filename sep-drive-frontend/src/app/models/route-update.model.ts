import { LatLngExpression } from 'leaflet';
import { CoordinateDto} from "./coordinate.model";

/**
 * Definiert die Struktur für eine Routen-Update-Nachricht,
 * die über den WebSocket gesendet wird.
 */
export interface RouteUpdate {
  rideId: number;
  start: CoordinateDto;
  destination: CoordinateDto;
  stops: CoordinateDto[];
}
