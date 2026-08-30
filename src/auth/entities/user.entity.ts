import { IsArray, IsBoolean, IsEmail, IsString, MinLength } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text', { unique: true })
  @IsEmail()
  email: string;

  @Column('text')
  @IsString()
  @MinLength(6) // Buena práctica para contraseñas
  password: string;

  @Column('text')
  @IsString()
  fullName: string;

  @Column('boolean', { default: true }) // Corregido 'int' por 'boolean' y por defecto activo
  @IsBoolean()
  isActive: boolean;

  @Column('text', { array: true, default: ['user'] })
  @IsArray()
  @IsString({ each: true }) // Valida que cada elemento del arreglo sea un string
  roles: string[];
}
