import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { DataSource, Repository } from 'typeorm';
import { PaginateDto } from '../common/dtos/paginatio.dto';
import { validate as isUUID } from 'uuid';
import { ProductImage } from './entities';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');
  constructor(
    // los repositorios ya los trae nest por defecto
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly datasource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...detailsProduct } = createProductDto;
      const product = this.productRepository.create({
        ...detailsProduct,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
      });
      await this.productRepository.save(product);
      return { ...product, images: images };
    } catch (error: unknown) {
      this.habldeDBException(error);
    }
  }

  // TODO Paginar
  async findAll(paginationDto: PaginateDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    const products = await this.productRepository.find({
      take: limit,
      skip: offset,
      // TODO relaciones
      relations: {
        images: true,
      },
    });

    return products.map(({ images, ...productDetail }) => ({
      ...productDetail,
      images: images?.map((img) => img.url) || [],
    }));
  }

  async findOne(term: string) {
    let product: Product | null;
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      //product = await this.productRepository.findOneBy({ slug: term });
      const queryBuilder = this.productRepository.createQueryBuilder('product');
      /*product = await queryBuilder
        .where('product.title ILIKE :title OR product.slug = :slug', {
          title: term,
          slug: term,
        })
        .getOne();*/

      product = await queryBuilder
        .where('UPPER(product.title) =:title OR product.slug =:slug', {
          title: term.toUpperCase(),
          slug: term,
        })
        .leftJoinAndSelect('product.images', 'prodImages')
        .getOne();
    }
    //const product = await this.productRepository.findOneBy({ id });
    if (!product)
      throw new NotFoundException(`Product with id ${term} not found`);

    return product;
  }

  async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);
    return {
      ...rest,
      images: images.map((image) => image.url),
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const {images, ...toUpdate} = updateProductDto;
    const product = await this.productRepository.preload({
      id: id,
      ...toUpdate,
    });
    if (!product)
      throw new NotFoundException(`Product with id ${id} not found`);

    const queryRunner = this.datasource.createQueryRunner();
    try {
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.habldeDBException(error);
    }
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
