import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '../entities/address.entity.js';

@Injectable()
export class AddressRepository {
  constructor(
    @InjectRepository(Address)
    private readonly repo: Repository<Address>,
  ) {}

  async findByUserId(userId: number): Promise<Address[]> {
    return this.repo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<Address | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Partial<Address>): Promise<Address> {
    const address = this.repo.create(data);
    return this.repo.save(address);
  }

  async update(id: number, data: Partial<Address>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async resetDefault(userId: number): Promise<void> {
    await this.repo.update({ userId }, { isDefault: false });
  }
}
