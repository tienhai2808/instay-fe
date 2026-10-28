export type RoomTypePriceType = "percent" | "amount";

export interface RoomTypePricePricingTag {
  id: string;
  name: string;
}

export interface RoomTypePrice {
  id: string;
  room_type_id: string;
  pricing_tag_id: string;
  pricing_type: RoomTypePriceType;
  pricing_value: number;
  pricing_tag?: RoomTypePricePricingTag | null;
}
