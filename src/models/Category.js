const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
      required: true,
      default: 'list-outline',
    },
    group: {
      type: String,
      enum: [
        'Health & Wellness',
        'Business & Finance',
        'Creative Arts',
        'Technology & Development',
        'Marketing & Media',
        'Education & Teaching',
        'Lifestyle & Personal Development',
        'Other',
      ],
      default: 'Other',
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
categorySchema.index({ isActive: 1, sortOrder: 1 });
categorySchema.index({ id: 1 });

module.exports = mongoose.model('Category', categorySchema);
