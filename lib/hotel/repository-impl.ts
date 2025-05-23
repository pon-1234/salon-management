import { Hotel } from '../types/hotel';
import { HotelRepository } from './repository';
import { hotels as initialHotels } from './data';

export class HotelRepositoryImpl implements HotelRepository {
  private hotels: Hotel[] = [...initialHotels];

  async getAllHotels(): Promise<Hotel[]> {
    return this.hotels;
  }

  async getHotelsByQuery(query: string): Promise<Hotel[]> {
    return this.hotels.filter(
      hotel => 
        hotel.name.toLowerCase().includes(query.toLowerCase()) ||
        hotel.address.toLowerCase().includes(query.toLowerCase())
    );
  }

  async addHotel(hotel: Omit<Hotel, 'id'>): Promise<Hotel> {
    const newHotel = { ...hotel, id: Date.now().toString() };
    this.hotels.push(newHotel);
    return newHotel;
  }

  async updateHotel(id: string, hotelUpdate: Partial<Hotel>): Promise<Hotel> {
    const index = this.hotels.findIndex(h => h.id === id);
    if (index === -1) throw new Error('Hotel not found');
    this.hotels[index] = { ...this.hotels[index], ...hotelUpdate };
    return this.hotels[index];
  }

  async deleteHotel(id: string): Promise<void> {
    const index = this.hotels.findIndex(h => h.id === id);
    if (index !== -1) {
      this.hotels.splice(index, 1);
    }
  }
}
