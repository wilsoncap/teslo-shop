import { Type } from "class-transformer";
import { IsOptional, IsPositive, Min, min } from "class-validator";


export class PaginateDto {
  @IsOptional()
  @IsPositive()
  //transformar
  @Type(()=> Number)// enableImplicitConversions: true
  limit?: number;

  @IsOptional()
  //@IsPositive()
  @Type(()=> Number)// enableImplicitConversions: true
  @Min(0)
  offset?: number;
}
