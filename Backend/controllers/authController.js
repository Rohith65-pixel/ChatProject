import User from "../models/userModel.js";
import asyncHandler from "express-async-handler";
import genToken from "../utils/generateToken.js";

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, bio } = req.body;

    if (!name || !email || !password) {
        res.status(400);
        throw new Error('Please fill in all required fields');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('Account already exists!');
    }

    const user = await User.create({ name, email, password, bio });

    genToken(user._id, res);

    res.status(201).json({
        message: 'Registered successfully!',
        details: {
            _id: user._id,
            name: user.name,
            email: user.email,
            bio: user.bio
        }
    });
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400);
        throw new Error('Please fill in all required fields');
    }

    const user = await User.findOne({ email });

    if (!user || !(await user.checkPassword(password))) {
        res.status(401);
        throw new Error('Invalid email or password');
    }

    genToken(user._id, res);

    res.status(200).json({
        message: 'Login successful',
        details: {
            _id: user._id,
            name: user.name,
            email: user.email
        }
    });
});

const logoutUser = asyncHandler(async (req, res) => {
    res.clearCookie('jwt');
    return res.status(200).json({ message: 'Logout successful' });
});

const getUserinfo = asyncHandler(async (req, res) => {
    res.status(200).json({
        message: 'Profile fetch successful',
        details: req.user
    });
});

export { registerUser, loginUser, logoutUser, getUserinfo };