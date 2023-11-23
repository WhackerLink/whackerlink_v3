# WhackerLink

[![License](https://img.shields.io/badge/License-GPLv3-blue?style=for-the-badge)](https://www.gnu.org/licenses/gpl-3.0)

## Setup:

### Download NodeJS
#### Windows:

Download and install node.js: https://nodejs.org/en
#### Linux:
`sudo apt install nodejs npm`

### Setup Google Dev

Setup google sheets for integration. Pictures to show how it’s done are at the bottom. Follow the order of images 1 to 15. Link to google: https://console.cloud.google.com/projectcreate

### Setup Google Sheets Config

Setup your google sheets for channels and RIDs. Pictures at the bottom.

### Download WhackerLink

Clone whackerlink repository

### Set config files

Setup the config files. Rename the `config.example.yml` file to `config.yml` and open it in notepad or your favorite editor. Also rename the `rcon_logins.example.json` to `rcon_logins.json`.

### Finish config files

Put the google json file into the root directory of whackerlink and rename it to `google.json`. Open the `config.yml` file and under the `‘sheetsJson: './something-124.json'` change `‘./something-124.json’` to `‘google.json’`. Under the sheetsID put the google sheet that the rids and channels are listed in. The ID should look something like this: `14KmRdIIGcLWQnM4sWBKFxJOmqj7-Mh0vXO8taKsEgJU`. You can find this in the URL of your sheet while viewing.

Make sure to run `node token_generator.js -c config.yml` to generate your JWT for socket use. This is a **must** and a huge security upgrade. Double check at the top section of the config you have the fullPath set correctly (include a \ at the end of the path). And in the whackerlink folder create a folder called `db` that way the database will work.

### Run WhackerLink

Copy the directory your whackerlink files are in and open CMD. Run the command `cd "directory"` and then put the location of the folder in there and hit enter. After that run `npm i` and then `node index.js -c config.yml` and go to `http://localhost:3000` that whackerlink is running on.

```bash
cd (your dir wl is in)
npm i
node index.js -c config.yml
```

###

Enjoy whackerlink. Use `/sys_view` and `/sys_view/admin` at the end of the URL to look at status. Example: `http://localhost:3000/sys_view`

## Images:

(Images from Collin, K0NNK)

### Google Dev setup:

![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198712079630396/1.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198707600117860/2.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198708040515704/3.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198708506067094/4.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198708887769188/5.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198709617573998/6.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198710024405064/7.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198710401908857/8.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198710909411468/9.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198711421128825/10.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198723429408890/11.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198723869814784/12.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198724264071178/13.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198724628983928/14.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198725014851736/15.jpg)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198725371371661/16.jpg)

### Google Sheet example:

![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198303881580664/a.png?width=1088&height=612)
![image1](https://media.discordapp.net/attachments/1146051497285652560/1146198304175177738/b.png?width=1088&height=612)
