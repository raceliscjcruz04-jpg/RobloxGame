/**
 * Format Discord timestamp
 */
function formatTimestamp(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
}

/**
 * Format relative timestamp
 */
function formatRelativeTime(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

/**
 * Truncate string to length
 */
function truncate(str, maxLength = 100) {
  if (str.length > maxLength) {
    return str.slice(0, maxLength - 3) + '...';
  }
  return str;
}

/**
 * Generate random color
 */
function randomColor() {
  return Math.floor(Math.random() * 16777215).toString(16);
}

/**
 * Check if valid hex color
 */
function isValidColor(color) {
  return /^#[0-9A-F]{6}$/i.test(color);
}

module.exports = {
  formatTimestamp,
  formatRelativeTime,
  truncate,
  randomColor,
  isValidColor,
};
