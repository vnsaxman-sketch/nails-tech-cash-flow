export type PaymentMethod =
  | "Cash"
  | "Zelle"
  | "Venmo"
  | "Credit Card"
  | "Gift Card"
  | "Coupon";

export type ServiceCategory =
  | "Haircut"
  | "Haircut and Beard Trim"
  | "Beard Trim"
  | "Hair Wash and Style"
  | "Hair Coloring"
  | "Highlights"
  | "Perm"
  | "Hair Treatment"
  | "Kids Haircut"
  | "Extra Service";


export interface IncomeEntry {
  id: string;
  date: string;
  serviceCategory: ServiceCategory;
  extraServiceNote: string;
  clientName: string;
  serviceAmount: number;
  tipAmount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  biweeklyStartDate: string;
}

