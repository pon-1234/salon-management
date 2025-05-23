export interface Course {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export interface Option {
  id: string;
  name: string;
  price: number;
  note?: string;
}
