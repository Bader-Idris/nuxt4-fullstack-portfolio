import { Schema, model } from 'mongoose'

const EmailSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    ip: { type: String, required: true },
  },
  {
    timestamps: true,
  },
)

export const ReceivedEmail = model('Email', EmailSchema)
