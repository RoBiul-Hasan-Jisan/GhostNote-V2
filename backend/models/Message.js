import mongoose from 'mongoose';

const MESSAGE_TYPES = ['compliment', 'confession', 'crush', 'secret', 'feedback'];

const messageSchema = new mongoose.Schema({
  receiverId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: MESSAGE_TYPES,
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 500,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Explicitly never store sender info
messageSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

export { MESSAGE_TYPES };
export default mongoose.model('Message', messageSchema);
