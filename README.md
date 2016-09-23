# Telegram Logsaver

This [Node.js](https://nodejs.org) application automates downloading of messages from [Telegram Messenger](https://telegram.org/).

## Requirements
This application requires an ES6-friendly version of Node. It should run on Node v4 and higher.

## Installation
`npm install -g tg-logsaver`

## Usage
### Obtaining App ID and App Hash
The application must have an ID and hash to communicate with the Telegram API. These values may be obtained [via the App Configuration page](https://my.telegram.org/apps). You will be prompted for these values during the next step.

### Authorization
The application must be authorized to use your Telegram account. To do this, run `tg-logsaver auth` in the directory you wish to save logs. You will be prompted for your Telegram app ID and hash (if necessary), and your phone number, then sent a login code. Once the login code is entered and validated, the application will automatically save your Telegram app ID, app hash, and authorization key to the config file.

**Note:** The Telegram library this project relies on ([telegram.link](http://telegram.link/)) does not currently support 2-step verification. If you have 2-step verification enabled, try disabling it prior to authorizing. It can be re-enabled after authorization is complete.

### Saving Logs
To save all logs, simply run `tg-logsaver save` in the directory you wish to save logs. Logs are saved in the `logs` directory. 

When running for the first time, the process may take a while to complete, as the Telegram API limits the amount of messages that may be retrieved at one time. Subsequent runs won't bother downloading days that have already been downloaded.

**Note:** This application currently only support saving messages between users (i.e. not groups)

## License
ISC