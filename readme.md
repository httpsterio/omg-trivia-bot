## omg-trivia-bot

An IRC trivia bot for the omg.lol IRC server.

Requires Node.js v18 or later.

## Overview

This project is an enhanced replacement for the existing trivia bot used on the server. It connects to IRC using IRCv3 with SASL authentication and maintains persistent score tracking via SQLite.

The bot depends on the following libraries:

- **@iarna/toml**  
  Used to parse the configuration file and question bank definitions.

- **better-sqlite3**  
  Provides synchronous access to the SQLite database used for score tracking.

- **irc-framework**  
  Handles the IRC connection, authentication, and message handling.

## Installation and Configuration

Copy `config.example.toml` to `config.toml` and update the values as needed. This file contains sensitive information such as the IRC password and should not be committed to version control.

Question banks are loaded from TOML files located in the `./questions` directory.

The bot reads its configuration from `config.toml` at startup. Certain settings, such as admin users and the maximum number of allowed incorrect answers, can be reloaded at runtime without restarting the bot.

Run `npm install` to install the dependencies and `npm run start` to start the bot.

For tips on how to leave the bot running in the background, check ___[Setup examples](#setup-examples)___

## Commands

### User Commands

- **!scores \<total|month|week|day\>**  
  Displays the top scores for the specified time range.

- **!score \<username\>**  
  Displays the score history for a specific user.

- **!skip**  
  Skips the current question.

- **!list**  
  Lists all available question banks.

- **!status**  
  Displays the current trivia status.

### Admin Commands

- **!start**  
  Starts the trivia session.

- **!stop**  
  Stops the trivia session.

- **!reload**  
  Reloads the configuration file and all question banks.

- **!load \<id\>**  
  Enables a question bank by setting its `hidden` field to `false`.

- **!unload \<id\>**  
  Disables a question bank by setting its `hidden` field to `true`.

## Score Tracking

Correct answers are recorded in a SQLite database located in the `./data` directory. Each entry stores the user's nickname and the date the question was answered correctly.

This data is used to calculate:

- All time high scores
- Daily, weekly, and monthly leaderboards
- Per user lifetime scores

The database file is created automatically if it does not already exist. Manual inspection or modification can be done using the `sqlite3` command line tool or any compatible SQLite GUI. Backups can be created by copying the database file while the bot is not running.

It is strongly recommended to stop the bot before performing any database operations.

## Question Banks

Question banks are defined as TOML files located in the `./questions` directory. Each file must follow the structure below:

```toml
id = "1"
name = "bank name"
difficulty = "easy"
topic = "general"
hidden = false

[[questions]]
question = "this is a question?"
answer = [ "yes", "true" ]

[[questions]]
question = "no."
answer = [ "no", "false" ]
```

## Bank Metadata

The following metadata fields are required at the top level of each question bank file:

- **id**  
  A unique identifier for the question bank. Used by the `!load` and `!unload` commands.

- **name**  
  The display name shown when listing question banks. Short and descriptive values are recommended.

- **difficulty**  
  Currently informational only and not used by the bot logic.

- **topic**  
  Currently informational only and not used by the bot logic.

- **hidden**  
  Controls whether the question bank is active. When set to `true`, the bank is excluded from the question pool.

All fields except `hidden` must be strings. The `hidden` field must be a boolean.

Changes to the `hidden` field require a `!reload` command to take effect. The question pool is refreshed only at startup or during a reload.

## Question Definitions

Each question entry must include the following fields:

- `[[questions]]`  
  Marks the start of a new question entry.

- **question**  
  A string containing the question text.

- **answer**  
  An array containing one or more acceptable answers as strings.

Examples:

```toml
[[questions]]
question = "question 1"
answer = [ "option 1" ]

[[questions]]
question = "question 2"
answer = [ "option 1", "option 2" ]
```

When multiple answers are defined, any listed value is accepted. Both the player input and the stored answers are compared in lowercase, so case variations do not need to be duplicated.

Punctuation is not normalized. If commas, periods, dashes, or other characters appear in an answer, the player response must include them exactly.

## Bank Verification

Question banks are verified before they're added to the quiz, but it's also possible to run a verification manually.

Use `npm run verify` or `node verify-bank.js` in the root directory. It'll list all the successfully parsed banks and display any found formatting errors.

## Setup Examples

It's likely a good idea to install this bot on a server. For Linux, I recommend either running the bot as a systemd service or in a screen.

### Systemd setup

Create a service file /etc/systemd/system/trivia-bot.service

Add the following: 

```bash
[Unit]
Description=omg trivia bot
After=network.target

[Service]
WorkingDirectory=/path/to/bot
ExecStart=/usr/bin/npm start
Restart=always
User=yourusername
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Fill in the path to your bot and your username under which the bot is run. You need to have node in your path and you need to have run npm install first.

Then activate the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable trivia-bot
sudo systemctl start trivia-bot
sudo systemctl status trivia-bot
```

The logs can be found with journalctl by running:

`sudo journalctl -u trivia-bot.service`

### Screen / tmux

In case you're not on a distribution with systemd or don't want to use it, you can also run the bot via screen or tmux.

```bash
screen -S trivia-bot
# cd to the bot's folder where index.js is located
npm run start
```
and then press __Ctrl+A__ and then __D__ to leave the screen session in the background.

You can resume the session by typing `screen -rd trivia-bot`

For tmux, the operation is rather similar:

```bash
tmux new -s trivia-bot
# cd to the bot's folder where index.js is located
npm run start
```

Exit the session with __Ctrl+B__ and then __D__ and you can resume it with `tmux attach -t trivia-bot`.

## Contributing

Feature-wise, I think the bot is rather complete. If you have any suggestions, you can open an issue. If you find any bugs, you can either open an issue or just send in a pull request.

For questions, I'm more than happy to take in suggestions or pull-requests with ready-made question banks as long as they're made with care.
