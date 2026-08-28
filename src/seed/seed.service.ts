import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { initialData } from './data/seed-data';

@Injectable()
export class SeedService {
  constructor(private readonly productService: ProductsService) {}

  async runSeed() {
    await this.insertNewProducts();
    return 'SEED EXECUTED';
  }

  private async insertNewProducts() {
    await this.productService.deleteAllProduts();

    const products = initialData.products;

    const insertPromises: Promise<unknown>[] = [];

    products.forEach((product) => {
      insertPromises.push(this.productService.create(product));
    });

    const results = await Promise.all(insertPromises);

    return true;
  }
}
