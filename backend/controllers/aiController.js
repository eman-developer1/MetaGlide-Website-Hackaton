const {
  checkRateLimit,
  runChatConversation,
  generateDashboardSummary,
  parseSmartLeave,
} = require('../services/ai/aiOrchestrator');
const { getCooldownStatus, resetCooldown, triggerGeminiCooldown } = require('../services/ai/cooldownManager');

// @desc    Interactive AI Chat with Gemini + Groq Fallback and Tool Calling
// @route   POST /api/ai/chat
// @access  Private (All Roles)
const chatWithAI = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    // Rate Limiting Guardrail (~20 reqs/user/hr)
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded: You have reached the hourly limit of 20 AI requests. Please try again later.',
      });
    }

    const { messages, forceProvider } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A non-empty messages array is required.',
      });
    }

    const response = await runChatConversation({
      history: messages,
      caller: req.user,
      forceProvider,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('[AIChat Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An error occurred during AI processing.',
    });
  }
};

// @desc    Generate 3-5 Bullet Dashboard KPI Summary
// @route   POST /api/ai/dashboard-summary
// @access  Private (All Roles)
const getDashboardSummary = async (req, res) => {
  try {
    const { kpiData } = req.body;
    if (!kpiData || typeof kpiData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'kpiData object is required.',
      });
    }

    const result = await generateDashboardSummary({
      kpiData,
      caller: req.user,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[DashboardSummary Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate summary',
    });
  }
};

// @desc    Parse natural language text into structured leave request
// @route   POST /api/ai/smart-leave
// @access  Private (All Roles)
const smartLeave = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'prompt text is required.',
      });
    }

    const result = await parseSmartLeave({
      promptText: prompt,
      caller: req.user,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[SmartLeave Error]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to parse leave application',
    });
  }
};

// @desc    Get AI Status (Cooldown info, models)
// @route   GET /api/ai/status
// @access  Private
const getAIStatus = async (req, res) => {
  const cooldown = getCooldownStatus();
  return res.status(200).json({
    success: true,
    gemini: {
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      configured: !!process.env.GEMINI_API_KEY,
      onCooldown: cooldown.onCooldown,
      cooldownRemainingSeconds: cooldown.remainingSeconds,
      cooldownReason: cooldown.reason,
    },
    groq: {
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      configured: !!process.env.GROQ_API_KEY,
    },
  });
};

// @desc    Simulate or force Gemini failure to test Groq fallback
// @route   POST /api/ai/test-fallback
// @access  Private (Admin only)
const testFallback = async (req, res) => {
  triggerGeminiCooldown('Forced test cooldown triggered by Administrator');
  return res.status(200).json({
    success: true,
    message: 'Gemini placed on simulated 10-minute cooldown. Next requests will route to Groq automatically.',
    status: getCooldownStatus(),
  });
};

// @desc    Reset Gemini Cooldown
// @route   POST /api/ai/reset-cooldown
// @access  Private (Admin only)
const resetAICooldown = async (req, res) => {
  resetCooldown();
  return res.status(200).json({
    success: true,
    message: 'Gemini cooldown reset. Requests will prioritize Gemini first.',
    status: getCooldownStatus(),
  });
};

module.exports = {
  chatWithAI,
  getDashboardSummary,
  smartLeave,
  getAIStatus,
  testFallback,
  resetAICooldown,
};
