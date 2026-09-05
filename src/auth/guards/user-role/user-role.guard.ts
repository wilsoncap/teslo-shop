import { CanActivate, ExecutionContext, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { User } from '../../entities/user.entity';
import { use } from 'passport';

@Injectable()
export class UserRoleGuard implements CanActivate {

  constructor(
    private readonly reflector: Reflector
  ){}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {

    const validateRoles: string[] = this.reflector.get('roles', context.getHandler())

    if (!validateRoles) return true
    if (validateRoles.length === 0) return true

    const req = context.switchToHttp().getRequest();
    const user = req.user as User

    if(!user){
      throw new InternalServerErrorException('User not found');
    }

    for (let role of user.roles) {
      if (validateRoles.includes(role)) {
        return true
      }
      
    }

    throw new ForbiddenException(
     `USer ${user.fullName} need a valid role: ${ validateRoles}`
    )
  }
}
