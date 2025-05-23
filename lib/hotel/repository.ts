import { Hotel } from '../types/hotel';

export interface HotelRepository {
  getAllHotels(): Promise<Hotel[]>;
  getHotelsByQuery(query: string): Promise<Hotel[]>;
  addHotel(hotel: Omit<Hotel, 'id'>): Promise<Hotel>;
  updateHotel(id: string, hotel: Partial<Hotel>): Promise<Hotel>;
  deleteHotel(id: string): Promise<void>;
}
