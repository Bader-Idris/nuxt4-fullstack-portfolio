import { Schema, model, Document } from 'mongoose'
import { Product } from './Product'

const ReviewSchema = new Schema<IReview>(
  {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please provide rating'],
    },
    title: {
      type: String,
      trim: true,
      required: [true, 'Please provide review title'],
      maxlength: 100,
    },
    comment: {
      type: String,
      required: [true, 'Please provide review text'],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
  },
  { timestamps: true },
)

ReviewSchema.index({ product: 1, user: 1 }, { unique: true })

ReviewSchema.statics.calculateAverageRating = async function (
  productId: Schema.Types.ObjectId,
) {
  const result = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        numOfReviews: { $sum: 1 },
      },
    },
  ])

  try {
    await Product.findOneAndUpdate(
      { _id: productId },
      {
        averageRating: Math.ceil(result[0]?.averageRating || 0),
        numOfReviews: result[0]?.numOfReviews || 0,
      },
    )
  }
  catch (error) {
    console.log(error)
  }
}

ReviewSchema.post('save', async function (doc) {
  await doc.constructor.calculateAverageRating(doc.product)
})

ReviewSchema.post('remove', async function (doc) {
  await doc.constructor.calculateAverageRating(doc.product)
})

export const Review = model<IReview>('Review', ReviewSchema)
