import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { parseCookie } from "cookie";
const protect = async (req, res, next) => {
    try {
        const user = await authenticateUser(req.cookies.jwt);

        req.user = user;

        next();
    }
    catch (err) {
        res.status(401).json({
            message: "Authentication Failed!"
        });
    }
};


const authenticateUser = async (token) => {

    if (!token) {
        throw new Error("Token not found");
    }

    const decoded = jwt.verify(
        token,
        process.env.SECRET_KEY
    );

    // console.log("Decoded JWT:", decoded);

    const user = await User.findById(decoded._id)
        .select("-password");

    if (!user) {
        throw new Error("User not found");
    }

    return user;
};


const socketAuth = async (socket, next) => {
    try {
        // console.log("---- SOCKET AUTH ----");

        const cookies = parseCookie(
            socket.handshake.headers.cookie || ""
        );

        // console.log("Parsed cookies:", cookies);

        const user = await authenticateUser(cookies.jwt);

        socket.user = user;

        // console.log("SOCKET AUTH SUCCESS");

        next();

    } catch (err) {
        console.log("SOCKET AUTH ERROR:", err.message);

        next(new Error("Authentication Failed!"));
    }
};

export {
    protect,
    socketAuth
};