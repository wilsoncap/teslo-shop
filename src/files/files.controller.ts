import { BadRequestException, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter } from './helpers/fileFilter.helper';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
  ) {}

  @Get('products/:imageName')
  findProductImage(
    @Res() res: Response,
    @Param('imageName') imageName: string,
  ) {
    const path = this.filesService.getStaticProductImage(imageName);

    /*res.status(403).json({
      ok: false,
      path: path,
    });*/

    res.sendFile(path);
  }

  @Post('product')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: fileFilter,
    //limits: {fileSize: 1000}
    storage: diskStorage({
      destination: './static/products',
      filename: (req, file, cb) => {
        const fileExtension = file.mimetype.split('/')[1];
        cb(null, `${randomUUID()}.${fileExtension}`);
      },
    })
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {

    if (!file) {
      throw new BadRequestException('Make sure that file is an image');
    }

    const secureUrl = `${this.configService.get('HOST_API')}/files/products/${file.filename}`;
    return { secureUrl };
  }
}
