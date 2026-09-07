import jwt from 'jsonwebtoken';

const genToken = (id,res) => {
    const token = jwt.sign({_id:id},process.env.SECRET_KEY,{expiresIn:'30d'});
    res.cookie('jwt',token,{
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV != "dev",
        sameSite: 'strict' 
    })
};

export default genToken;