import { Schema, model } from 'mongoose'
import bcrypt from 'bcryptjs'
// TODO: use the predefined bun hashing, check this: https://bun.sh/guides/util/hash-a-password

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Please provide name"],
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Please provide email"],
      validate: {
        // todo is it powerful compared to validator.email??
        validator: (value: string) =>
          /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(value),
        message: "Please provide valid email",
      },
    },
    password: {
      type: String,
      required: false, // Not required for OAuth providers
      minlength: 6,
    },
    provider: {
      type: String,
      enum: ['email', 'google', 'facebook'],
      default: 'email',
    },
    role: {
      type: String,
      enum: ["admin", "user", "premium", "editor" ],
      default: "user",
    },
    verificationToken: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
    verified: Date,
    passwordToken: String,
    passwordTokenExpirationDate: Date,
  },
  {
    timestamps: true,
  }
);

UserSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new) and the provider is email
  if (!this.isModified('password') || this.provider !== 'email') return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
) {
  if (this.provider !== 'email') return false;
  return await bcrypt.compare(candidatePassword, this.password)
}

export const User = model<IUser>('User', UserSchema)