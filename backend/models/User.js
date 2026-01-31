const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    roles: {
      type: [String],
      enum: ['worker', 'employer', 'admin'],
      required: true,
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one role is required'
      }
    },
    phone: String,
    location: String,
    bio: String,
    profilePicture: String,
    companyName: String,
    companyWebsite: String,
    companyDescription: String,
    companyLogo: String,
    headline: String,
    summary: String,
    skills: [String],
    yearsExperience: Number,
    desiredRoles: [String],
    availability: {
      type: String,
      default: 'open'
    },
    portfolioUrl: String,
    linkedinUrl: String,
    githubUrl: String,
    allowContact: {
      type: Boolean,
      default: false
    },
    chatApp: String,
    chatHandle: String,
    resumeUrl: String,
    isDiscoverable: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    provider: String,
    providerId: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
