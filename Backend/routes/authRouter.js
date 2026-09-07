import express from "express";
import {protect} from "../middleware/authMiddleware.js"
import { registerUser,loginUser,getUserinfo,logoutUser } from "../controllers/authController.js";

const authRouter = express.Router();

authRouter.post('/login',loginUser);
authRouter.post('/register',registerUser);
authRouter.post('/logout',logoutUser)
authRouter.get('/profile',protect,getUserinfo);

export default authRouter;