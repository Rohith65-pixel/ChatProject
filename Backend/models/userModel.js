import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Username is required'], 
    trim: true 
  },
  email: { 
    type: String, 
    required: true,
    unique: true
  },
  password: {
    type: String,
    required:true
  },
  bio:{
    type: String
  },
  lastSeen:{
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

userSchema.pre('save',async function () { 
    if (!this.isModified('password')) 
        return ;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password,salt);
});

userSchema.methods.checkPassword = async function (pass) {
    return await bcrypt.compare(pass,this.password);
}

const User = mongoose.model('User',userSchema);

export default User;