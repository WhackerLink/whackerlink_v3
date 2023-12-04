# WhackerLink

[![License](https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

## Requirements:
### Google Developer Account and Google Sheets Setup
You'll need a Google Developer account and a Google Sheets document for channels and RIDs.
See [Google Setup](docs/google_dev_setup.md) for more information.

## Download
```sh
git clone git@github.com:WhackerLink/whackerlink.git
```

## Configure
Copy `config.example.yml` file to `config.yml` 
and `rcon_logins.example.json` to `rcon_logins.json`.

Place the Google json file into the root directory of WhackerLink and rename it to `google.json`. 
In `config.yml`, next to `sheetsID` paste the Google Sheet ID that the rids and channels are listed in.
The ID should look something like this: `XXXXXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXX`
You can find it in the URL while viewing your sheet.

Run `node token_generator.js -c config.yml` to generate your JWT used in web-sockets.

## Run
```sh
npm i
node index.js -c config.yml
```
Go to [`http://localhost:3000`](http://localhost:3000)

Visit
[`/sys_view`](http://localhost:3000/sys_view) and/or
[`/sys_view/admin`](http://localhost:3000/sys_view/admin) for 
status information.
