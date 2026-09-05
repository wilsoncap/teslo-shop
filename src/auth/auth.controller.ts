import { Controller, Post, Body, Get, UseGuards, Req, Header, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { request } from 'express';
import { GetUSer } from './decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { RawHeaders } from './decorators/get-rawheaders.decorator';
import { IncomingHttpHeaders } from 'http';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Get('private')
  @UseGuards(AuthGuard())
  testingPrivateRoute(
    @Req() request: Express.Request,
    @GetUSer() user: User,
    @GetUSer('email') userEmail: String,
    @RawHeaders() rawHEader: string[],
    //@Headers() headers: IncomingHttpHeaders,
  ) {
    console.log({request: request});
    
    return {
      ok: true,
      message: 'Hello word++++',
      user,
      userEmail,
      rawHEader,
      //headers
    };
  }
}
