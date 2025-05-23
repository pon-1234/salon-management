import { Hotel } from '../types/hotel';
import { HotelRepository } from './repository';

export class HotelUseCases {
  constructor(private repository: HotelRepository) {}

  async getAllHotels(): Promise<Hotel[]> {
    return this.repository.getAllHotels();
  }

  async getHotelsByQuery(query: string): Promise<Hotel[]> {
    return this.repository.getHotelsByQuery(query);
  }

  async addHotel(hotel: Omit<Hotel, 'id'>): Promise<Hotel> {
    return this.repository.addHotel(hotel);
  }

  async updateHotel(id: string, hotel: Partial<Hotel>): Promise<Hotel> {
    return this.repository.updateHotel(id, hotel);
  }

  async deleteHotel(id: string): Promise<void> {
    return this.repository.deleteHotel(id);
  }
}
