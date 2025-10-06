import mongoose from 'mongoose';
// import { Message, User } from '../models/mongo';
import { Message } from '../models/mongo';

export async function getContacts(userId: string, page: number, limit: number) {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  try {
    const contacts = await Message.aggregate([
      {
        $match: {
          $or: [{ from: userObjectId }, { to: userObjectId }],
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$from', userObjectId] },
              then: '$to',
              else: '$from',
            },
          },
          lastMessage: { $first: '$$ROOT' },
        },
      },
      {
        $sort: { 'lastMessage.timestamp': -1 },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users', // The name of the User collection in MongoDB
          localField: '_id',
          foreignField: '_id',
          as: 'contactInfo',
        },
      },
      {
        $unwind: '$contactInfo',
      },
      {
        $project: {
          _id: 0,
          userId: '$contactInfo._id',
          name: '$contactInfo.name',
          lastMessage: {
            id: '$lastMessage._id',
            message: '$lastMessage.message',
            timestamp: '$lastMessage.timestamp',
            from: '$lastMessage.from',
            to: '$lastMessage.to',
          },
        },
      },
    ]);

    return contacts;
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw new Error('Failed to fetch contacts');
  }
}
