function computeBackoff(attempt, base = 2) {
  return Math.pow(base, attempt) * 1000; // milliseconds
}

module.exports = { computeBackoff };
