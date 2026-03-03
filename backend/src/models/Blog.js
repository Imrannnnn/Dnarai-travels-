import mongoose from 'mongoose';

/**
 * Blog model to store posts
 */
const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    imageUrl: {
        type: String,
        default: ''
    },
    comments: [{
        text: { type: String, required: true },
        author: { type: String, default: 'Anonymous' }, // Anyone can comment
        createdAt: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

/**
 * Pre-save middleware to update the updatedAt field
 */
blogSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export const Blog = mongoose.model('Blog', blogSchema);
