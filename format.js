// IRC formatting codes
const CODES = {
  BOLD: "\x02",
  ITALIC: "\x1D",
  UNDERLINE: "\x1F",
  RESET: "\x0F",
  COLOR: "\x03",
};

// Color codes (foreground)
const COLORS = {
  WHITE: "00",
  BLACK: "01",
  BLUE: "02",
  GREEN: "03",
  RED: "04",
  BROWN: "05",
  PURPLE: "06",
  ORANGE: "07",
  YELLOW: "08",
  LIGHT_GREEN: "09",
  CYAN: "10",
  LIGHT_CYAN: "11",
  LIGHT_BLUE: "12",
  PINK: "13",
  GREY: "14",
  LIGHT_GREY: "15",
};

// Helper functions
function bold(text) {
  return `${CODES.BOLD}${text}${CODES.BOLD}`;
}

function italic(text) {
  return `${CODES.ITALIC}${text}${CODES.ITALIC}`;
}

function underline(text) {
  return `${CODES.UNDERLINE}${text}${CODES.UNDERLINE}`;
}

function color(text, fg, bg = null) {
  const bgCode = bg ? `,${bg}` : "";
  return `${CODES.COLOR}${fg}${bgCode}${text}${CODES.RESET}`;
}

// Strip all formatting
function strip(text) {
  return text.replace(/[\x02\x1D\x1F\x0F\x03\d{0,2}(,\d{0,2})?]/g, "");
}

module.exports = {
  CODES,
  COLORS,
  bold,
  italic,
  underline,
  color,
  strip,
};
