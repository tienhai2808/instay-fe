export interface GetDashboardBookingOverviewRequest {
  from_date?: string;
  to_date?: string;
}

export interface GetDashboardBookingRevenueRequest {
  room_type_id?: string;
}

export interface GetDashboardRoomTypeRevenueRequest {
  from_date?: string;
  to_date?: string;
}

export interface GetDashboardSourceRevenueRequest {
  from_date?: string;
  to_date?: string;
}
