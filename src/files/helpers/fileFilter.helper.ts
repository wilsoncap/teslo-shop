
import 'multer';

export const fileFilter = (req: Express.Request, file: Express.Multer.File, callback: Function) => {
    console.log({file});

    if (!file) return callback(new Error('File is Empty'), false)

    const fileEstension = file.mimetype.split('/')[1];
    const validateExtension = ['jpg', 'jpeg', 'png', 'gif'];

    if (validateExtension.includes(fileEstension)) {
        return callback(null, true)
    }

    callback(null, false);
    
};