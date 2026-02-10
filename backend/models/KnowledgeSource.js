const mongoose = require('mongoose');

const knowledgeSourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    sourceUrl: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      default: 'success'
    },
    errorMessage: {
      type: String,
      trim: true
    },
    externalId: {
      type: String,
      trim: true
    },
    contentLength: {
      type: Number
    },
    provider: {
      type: String,
      default: 'paichat'
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeSource', knowledgeSourceSchema);
