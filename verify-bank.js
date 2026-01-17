const fs = require("fs");
const toml = require("@iarna/toml");
const path = require("path");

/**
 * Validates a single TOML question bank file.
 * @param {string} filepath - Path to the TOML file
 * @returns {string[]} Array of error messages (empty if valid)
 */
function verifyBank(filepath) {
  const errors = [];
  const filename = path.basename(filepath);

  // Check file exists
  if (!fs.existsSync(filepath)) {
    errors.push(`File not found: ${filepath}`);
    return errors;
  }

  // Read file
  let content;
  try {
    content = fs.readFileSync(filepath, "utf8");
  } catch (err) {
    errors.push(`Cannot read file: ${err.message}`);
    return errors;
  }

  // Parse TOML
  let data;
  try {
    data = toml.parse(content);
  } catch (err) {
    errors.push(`TOML parse error: ${err.message}`);
    return errors;
  }

  // Validate required metadata fields
  const requiredStrings = ["id", "name", "difficulty", "topic"];
  for (const field of requiredStrings) {
    if (data[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    } else if (typeof data[field] !== "string") {
      errors.push(
        `Field "${field}" must be a string, got ${typeof data[field]}`,
      );
    }
  }

  // Validate hidden field (boolean)
  if (data.hidden === undefined) {
    errors.push(`Missing required field: hidden`);
  } else if (typeof data.hidden !== "boolean") {
    errors.push(`Field "hidden" must be a boolean, got ${typeof data.hidden}`);
  }

  // Validate questions array
  if (!data.questions) {
    errors.push(`Missing required field: questions`);
  } else if (!Array.isArray(data.questions)) {
    errors.push(`Field "questions" must be an array`);
  } else {
    data.questions.forEach((q, index) => {
      const qNum = index + 1;

      // Validate question field
      if (q.question === undefined) {
        errors.push(`Question ${qNum}: missing "question" field`);
      } else if (typeof q.question !== "string") {
        errors.push(`Question ${qNum}: "question" must be a string`);
      }

      // Validate answer field
      if (q.answer === undefined) {
        errors.push(`Question ${qNum}: missing "answer" field`);
      } else if (!Array.isArray(q.answer)) {
        errors.push(`Question ${qNum}: "answer" must be an array`);
      } else if (q.answer.length === 0) {
        errors.push(`Question ${qNum}: "answer" array cannot be empty`);
      } else {
        q.answer.forEach((ans, ansIndex) => {
          if (typeof ans !== "string") {
            errors.push(
              `Question ${qNum}: answer[${ansIndex}] must be a string`,
            );
          }
        });
      }
    });
  }

  return errors;
}

/**
 * Validates all TOML files in a directory.
 * @param {string} dir - Directory containing TOML files
 * @returns {{ valid: string[], broken: Array<{file: string, errors: string[]}> }}
 */
function verifyAllBanks(dir) {
  const result = { valid: [], broken: [] };

  let files;
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".toml"));
  } catch (err) {
    console.error(`Cannot read directory ${dir}: ${err.message}`);
    return result;
  }

  for (const file of files) {
    const filepath = path.join(dir, file);
    const errors = verifyBank(filepath);

    if (errors.length === 0) {
      result.valid.push(file);
    } else {
      result.broken.push({ file, errors });
    }
  }

  return result;
}

// Run directly for manual verification
if (require.main === module) {
  const dir = process.argv[2] || "./questions";

  console.log(`Verifying TOML files in ${dir}...\n`);

  const { valid, broken } = verifyAllBanks(dir);

  if (valid.length > 0) {
    console.log(`Valid banks (${valid.length}):`);
    valid.forEach((f) => console.log(`  OK ${f}`));
    console.log();
  }

  if (broken.length > 0) {
    console.log(`Broken banks (${broken.length}):`);
    broken.forEach(({ file, errors }) => {
      console.log(`  error in ${file}`);
      errors.forEach((err) => console.log(`      - ${err}`));
    });
    console.log();
  }

  console.log(`Summary: ${valid.length} valid, ${broken.length} broken`);

  process.exit(broken.length > 0 ? 1 : 0);
}

module.exports = { verifyBank, verifyAllBanks };
