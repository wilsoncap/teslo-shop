import { createParamDecorator, ExecutionContext } from "@nestjs/common";


export const RawHeaders = createParamDecorator(
    (data: string[], ctx: ExecutionContext) => {

        const req = ctx.switchToHttp().getRequest();
        
        //console.log({ctx: req[rawHeaders]});

        return req.rawHeaders
        
        
    }
)