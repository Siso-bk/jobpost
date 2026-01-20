const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    company: {
      type: String,
      required: true
    },
    logoUrl: String,
    location: {
      type: String,
      required: true
    },
    salary: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    },
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship'],
      required: true
    },
    category: String,
    skills: [String],
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior'],
      default: 'mid'
    },
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    applicants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    views: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Indexes for faster search and common queries
jobSchema.index({ title: 'text', description: 'text', company: 'text', location: 'text' });
jobSchema.index({ employerId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
