// colors.js — helper warna terminal pakai ANSI escape code manual (tanpa library)

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  green: (s) => `\x1b[32m${s}\x1b[0m`,
  neonGreen: (s) => `\x1b[1;92m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  neonBlue: (s) => `\x1b[1;96m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  gray: (s) => `\x1b[90m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold_: (s) => `\x1b[1m${s}\x1b[0m`,
};

module.exports = c;
