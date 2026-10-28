export interface UpdateTenantRequest {
  logo?: string | null;
  name?: string;
  phone?: string;
  city?: string;
}

export interface UpdateTenantSettingsRequest {
  imap: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
  email_booking: {
    subject: string[];
    booking_number: string[];
    guest: string[];
    check_in: string[];
    check_out: string[];
    booked_on: string[];
    rooms_booked: string[];
    source: string[];
    total_net_price: string[];
    total_sell_price: string[];
    guest_number: string[];
    room_number: string[];
    promotion_name: string[];
    meal_plan: string[];
    booking_conditions: string[];
    booking_preferences: string[];
  };
  email_cancel: {
    subject: string[];
    bodies: string[];
  };
}
