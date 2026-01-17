import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if mobile number already exists
    const existingUser = await this.userRepository.findOne({
      where: { mobileNumber: createUserDto.mobileNumber },
    });

    if (existingUser) {
      throw new ConflictException(
        'User with this mobile number already exists',
      );
    }

    // Check secondary mobile number if provided
    if (createUserDto.secondaryMobileNumber) {
      const existingSecondary = await this.userRepository.findOne({
        where: { secondaryMobileNumber: createUserDto.secondaryMobileNumber },
      });

      if (existingSecondary) {
        throw new ConflictException(
          'User with this secondary mobile number already exists',
        );
      }
    }

    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByMobileNumber(mobileNumber: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { mobileNumber },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check if mobile number is being updated and conflicts with existing user
    if (
      updateUserDto.mobileNumber &&
      updateUserDto.mobileNumber !== user.mobileNumber
    ) {
      const existingUser = await this.userRepository.findOne({
        where: { mobileNumber: updateUserDto.mobileNumber },
      });

      if (existingUser) {
        throw new ConflictException(
          'User with this mobile number already exists',
        );
      }
    }

    // Check secondary mobile number if being updated
    if (
      updateUserDto.secondaryMobileNumber &&
      updateUserDto.secondaryMobileNumber !== user.secondaryMobileNumber
    ) {
      const existingSecondary = await this.userRepository.findOne({
        where: { secondaryMobileNumber: updateUserDto.secondaryMobileNumber },
      });

      if (existingSecondary) {
        throw new ConflictException(
          'User with this secondary mobile number already exists',
        );
      }
    }

    Object.assign(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  async updateConsent(id: string, consentText: string): Promise<User> {
    const user = await this.findOne(id);
    user.isConsent = true;
    user.consentText = consentText;
    return await this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}
