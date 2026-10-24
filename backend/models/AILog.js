const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'anonymous',
      index: true,
    },
    userName: {
      type: String,
      default: '',
    },
    userRole: {
      type: String,
      default: 'Employee',
    },
    endpoint: {
      type: String, // '/ai/chat', '/ai/dashboard-summary', '/ai/smart-leave'
      required: true,
    },
    providerUsed: {
      type: String, // 'gemini' | 'groq' | 'fallback_error'
      required: true,
      index: true,
    },
    primaryFailed: {
      type: Boolean,
      default: false,
    },
    fallbackReason: {
      type: String,
      default: '',
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    toolCalls: [
      {
        name: String,
        args: mongoose.Schema.Types.Mixed,
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AILog', aiLogSchema);
