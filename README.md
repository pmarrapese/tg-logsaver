# Telegram Logsaver

This [Node.js](https://nodejs.org) application automates downloading of messages from [Telegram Messenger](https://telegram.org/).

## Requirements
This application requires an ES6-friendly version of Node. It should run on Node v4 and higher.

## Usage
### Obtaining App ID and App Hash
The application must have an ID and hash to communicate with the Telegram API. These values may be obtained [via the App Configuration page](https://my.telegram.org/apps).

Once your ID and hash are created, set them in `config/config.json`. You may also explicitly specify a data center IP address, though the app will automatically try to determine the appropriate data center to use at the time of authorization. 

### Authorization
The application must then be authorized to use your Telegram account. To do this, run `node . auth` in the project root directory. You will be prompted for your phone number and sent a login code. Once the login code is entered and validated, the application will automatically save your authorization key to the config file.

**Note:** The Telegram library this project relies on ([telegram.link](http://telegram.link/)) does not currently support 2-step verification. If you have 2-step verification enabled, try disabling it prior to authorizing. It can be re-enabled after authorization is complete.

### Saving Logs
To save all logs, simply run `node . save` in the project root directory. Logs are saved in the `logs` directory. 

When running for the first time, the process may take a while to complete, as the Telegram API limits the amount of messages that may be retrieved at one time. Subsequent runs won't bother downloading days that have already been downloaded.

**Note:** This application currently only support saving messages between users (i.e. not groups)

## License
ISC