import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AddressRepository } from '../repositories/address.repository.js';
import { CreateAddressDto, UpdateAddressDto } from '../dtos/create-address.dto.js';
import { Address } from '../entities/address.entity.js';

@Injectable()
export class AddressService {
  constructor(private readonly addressRepository: AddressRepository) {}

  async findByUserId(userId: number): Promise<Address[]> {
    return this.addressRepository.findByUserId(userId);
  }

  async create(userId: number, dto: CreateAddressDto): Promise<Address> {
    if (dto.isDefault) {
      await this.addressRepository.resetDefault(userId);
    }
    return this.addressRepository.create({ ...dto, userId });
  }

  async update(userId: number, addressId: number, dto: UpdateAddressDto): Promise<void> {
    const address = await this.addressRepository.findById(addressId);
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException('Not your address');

    if (dto.isDefault) {
      await this.addressRepository.resetDefault(userId);
    }

    await this.addressRepository.update(addressId, dto);
  }

  async delete(userId: number, addressId: number): Promise<void> {
    const address = await this.addressRepository.findById(addressId);
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException('Not your address');
    await this.addressRepository.delete(addressId);
  }
}
