export type CustomerGender = "male" | "female" | "other" | string;

export interface Customer {
  id: string;
  birth_year?: number;
  gender?: CustomerGender;
  phone?: string;
  created_at?: string;
}
