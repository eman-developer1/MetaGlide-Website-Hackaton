let geminiCooldownUntil = null;
let lastCooldownReason = '';

const getCooldownMinutes = () => {
  const envVal = parseInt(process.env.GEMINI_COOLDOWN_MINUTES, 10);
  return isNaN(envVal) || envVal <= 0 ? 10 : envVal;
};

const isGeminiOnCooldown = () => {
  if (!geminiCooldownUntil) return false;
  if (Date.now() > geminiCooldownUntil) {
    // Cooldown expired
    geminiCooldownUntil = null;
    lastCooldownReason = '';
    return false;
  }
  return true;
};

const triggerGeminiCooldown = (reason = 'Rate limit or quota exhausted') => {
  const minutes = getCooldownMinutes();
  geminiCooldownUntil = Date.now() + minutes * 60 * 1000;
  lastCooldownReason = reason;
  console.log(`[AI Cooldown] Gemini placed on ${minutes}m cooldown until ${new Date(geminiCooldownUntil).toLocaleTimeString()}. Reason: ${reason}`);
};

const getCooldownStatus = () => {
  const onCooldown = isGeminiOnCooldown();
  return {
    onCooldown,
    remainingSeconds: onCooldown ? Math.ceil((geminiCooldownUntil - Date.now()) / 1000) : 0,
    reason: lastCooldownReason,
  };
};

const resetCooldown = () => {
  geminiCooldownUntil = null;
  lastCooldownReason = '';
};

module.exports = {
  isGeminiOnCooldown,
  triggerGeminiCooldown,
  getCooldownStatus,
  resetCooldown,
};
