import type { Document } from 'mongoose'
import { Schema, model } from 'mongoose'

export interface IReceivedEmail extends Document {
  name: string
  email: string
  message: string
  ip: string
  createdAt: Date
  updatedAt: Date
}

const EmailSchema = new Schema<IReceivedEmail>(
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

export const ReceivedEmail = model<IReceivedEmail>('Email', EmailSchema)
