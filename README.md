# WhackerLink

[![License](https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

# DEPRECATED  DEPRECATED

## This repo is now DEPRECATED. Use: https://github.com/WhackerLink/whackerlink_v4 instead.

## Requirements:
### Google Developer Account and Google Sheets Setup
You'll need a Google Developer account and a Google Sheets document for channels and RIDs.
See [Google Setup](docs/google_dev_setup.md) for more information.

## Download
```sh
git clone git@github.com:WhackerLink/whackerlink.git
```

## Configure
Copy `config/config.example.yml` to `config/config.yml`.

Place the Google json file into the `config/` directory and rename it to `google.json`. 
In `config.yml`, next to `sheetsID` paste the Google Sheet ID that the rids and channels are listed in.
The ID should look something like this: `XXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXX`
You can find it in the URL while viewing your sheet.

Run `node token_generator.js` to generate your JWT used in web-sockets.

## Run
```sh
npm start

# for debug info
DEBUG=WhackerLink:* npm start

# To use an alternative config file
npm start -- -c /path/to/config.yml
```
Go to [`https://localhost:3000`](https://localhost:3000)

Visit
[`/sys_view`](https://localhost:3000/sys_view) and/or
[`/sys_view/admin`](https://localhost:3000/sys_view/admin) for
status information.
