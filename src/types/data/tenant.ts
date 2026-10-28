export interface Tenant {
  logo?: string | null;
  name?: string;
  phone?: string;
  city?: string;
}

export type TenantPatternList = string[];

export interface TenantIMAPSettings {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  has_password?: boolean;
}

export interface TenantEmailBookingSettings {
  subject?: TenantPatternList;
  booking_number?: TenantPatternList;
  guest?: TenantPatternList;
  check_in?: TenantPatternList;
  check_out?: TenantPatternList;
  booked_on?: TenantPatternList;
  rooms_booked?: TenantPatternList;
  source?: TenantPatternList;
  total_net_price?: TenantPatternList;
  total_sell_price?: TenantPatternList;
  guest_number?: TenantPatternList;
  room_number?: TenantPatternList;
  promotion_name?: TenantPatternList;
  meal_plan?: TenantPatternList;
  booking_conditions?: TenantPatternList;
  booking_preferences?: TenantPatternList;
}

export interface TenantEmailCancelSettings {
  subject?: TenantPatternList;
  bodies?: TenantPatternList;
}

export interface TenantSettings {
  imap?: TenantIMAPSettings;
  email_booking?: TenantEmailBookingSettings;
  email_cancel?: TenantEmailCancelSettings;
}
