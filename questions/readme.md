# Questions

Questions are loaded from TOML files in this directory. Each file represents a category or subcategory of questions and is referred to as a **question bank**. Banks can be loaded and unloaded from within the bot.

When authoring questions, check if there is an existing bank the question fits into and add it there. If the question warrants a new category, create a new file.

## File Naming

Files are named using the pattern `<id>-<slug>.toml`, where `<id>` is a numeric prefix that matches the `id` field inside the file, and `<slug>` is a short descriptive name. For example:

```
101-periodic-table.toml
501-movies.toml
```

The numeric prefix is used to group banks by broad topic area:

| Range | Topic area |
|-------|-----------|
| 1xx   | General knowledge, science, geography |
| 2xx   | Technology |
| 3xx   | Video games |
| 4xx   | Food & drink |
| 5xx   | Film & television |
| 6xx   | Biology & medicine |

Choose the next available ID in the appropriate range when creating a new bank.

## File Format

Each TOML file has a header section describing the bank, followed by one or more `[[questions]]` entries.

```toml
id = "101"
name = "Periodic Table"
difficulty = "hard"
topic = "chemistry"
hidden = true

[[questions]]
question = "What is the chemical symbol for Gold?"
answer = [ "Au", "Aurum" ]

[[questions]]
question = "What is the chemical symbol for Iron?"
answer = [ "Fe" ]
```

### Bank Header Fields

- **`id`** - A string that matches the numeric prefix of the filename. For `101-periodic-table.toml` the value is `"101"`.

- **`name`** - The display name shown in-game when loading or unloading the bank.

- **`difficulty`** - A general indication of how hard the questions are. Not yet used by the bot, but should be set to one of `"easy"`, `"medium"`, or `"hard"`.

- **`topic`** - A short description of the subject area (e.g. `"chemistry"`, `"geography"`, `"gaming"`). Not yet used by the bot.

- **`hidden`** - Controls whether the bank is part of the active question pool. Set to `true` by default in new files. The bot updates this value when banks are loaded or unloaded. It must be a boolean literal (`true` or `false`), not a string.

## Questions

Each question is written as a TOML [array of tables](https://toml.io/en/v1.0.0#array-of-tables) entry:

```toml
[[questions]]
question = "What is the chemical symbol for Gold?"
answer = [ "Au", "Aurum" ]
```

- **`question`** - The question text displayed to players. Write it as a complete sentence ending with a `?`.

- **`answer`** - An array of accepted answers. All values in the array are treated as equally valid, so use this for alternate spellings, abbreviations, or historical names - not for multiple-choice options. Answer matching is case-insensitive, so `"Au"` and `"au"` are both accepted. 

__nb. even when there's only one correct answer, the answer should be an array with a string within.__

### Multiple Accepted Answers

Use the array to list legitimate alternative answers, not distractors:

```toml
[[questions]]
question = "Which element on the periodic table has the symbol Na?"
answer = [ "Sodium", "Natrium" ]

[[questions]]
question = "Which element on the periodic table has the symbol W?"
answer = [ "Tungsten", "Wolfram" ]
```

### Organizing Questions with Comments

TOML comments (`#`) can be used to group related questions within a file. This is useful for large banks that cover multiple sub-topics:

```toml
# Spielberg
## Jaws
[[questions]]
question = "Which movie director directed the film 'Jaws'?"
answer = [ "Steven Spielberg", "Spielberg" ]

## E.T.
[[questions]]
question = "Which movie director directed the film 'E.T. the Extra-Terrestrial'?"
answer = [ "Steven Spielberg", "Spielberg" ]
```

Comments are ignored by the parser and are for author reference only.

## Tips for Authoring Good Questions

- Prefer questions with a single clear, unambiguous answer.
- If a concept has well-known alternate names or spellings, include them all in the `answer` array.
- If an answer contains diacritics _(E.g. á, é, ä, ö...)_, add a simplified spelling option as well.
- Avoid questions where the phrasing gives away the answer.
- Questions should be self-contained, don't reference previous questions.
- If a bank grows large, consider splitting it into sub-banks with a shared numeric prefix (e.g. `301-overwatch.toml`, `302-final-fantasy.toml`).
