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
    role: {
      type: String,
      enum: ['worker', 'employer'],
      required: true
    },
    roles: {
      type: [String],
      enum: ['worker', 'employer', 'admin'],
      default: function () {
        return this.role ? [this.role] : [];
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

userSchema.pre('save', function (next) {
  if (this.role) {
    const roles = new Set(Array.isArray(this.roles) ? this.roles : []);
    roles.add(this.role);
    this.roles = Array.from(roles);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
