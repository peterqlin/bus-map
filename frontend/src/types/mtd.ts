export interface VehicleLocation {
  vehicle_id: string;
  lat: number;
  lon: number;
  route_id: string;
  trip_id: string;
  shape_id: string;
  next_stop_id: string;
  last_updated: string;
  heading: number;
}

export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_color: string;
  route_text_color: string;
}

export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
}

export interface ShapePoint {
  shape_pt_lat: number;
  shape_pt_lon: number;
  shape_pt_sequence: number;
}

export interface WebSocketMessage {
  type: 'vehicles';
  data: VehicleLocation[];
}
