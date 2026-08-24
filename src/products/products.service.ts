import {
  BadRequestException,
  Get,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');
  constructor(
    // los repositorios ya los trae nest por defecto
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);
      return product;
    } catch (error: unknown) {
      this.habldeDBException(error);
    }
  }

  // TODO Paginar
  findAll() {
    return this.productRepository.find();
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOneBy({ id });
    if (!product)
      throw new NotFoundException(`Product with id ${id} not found`);
    return product;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  async remove(id: string) {
    const product = await this.productRepository.findOneBy({ id });
    if (!product)
      throw new NotFoundException(`Product with id ${id} not found`);
    return this.productRepository.delete(id);
  }

  private habldeDBException(error: unknown) {
    const dbError = error as { code?: string; detail?: string };

    if (dbError.code === '23505') {
      throw new BadRequestException(dbError.detail);
    }

    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server log',
    );
  }
}
