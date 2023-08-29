# WhackerLink Setup Guide:

Currently only tested for Windows 10/Server 2019. Linux and other versions of Windows may not work properly. Readme written by Collin K0NNK, WhackerLink developed by Caleb KO4UYJ.

## Step 1:

Download node.js and make sure it’s running on your computer. `https://nodejs.org/en`

## Step 2:

Setup google sheets for dev. Pictures to show how it’s done is in `/pictures`. Follow the order of images 1 to 15. Link to google: https://console.cloud.google.com/projectcreate

## Step 3:

Setup your google sheets for channels and RIDs. Pictures in `/pictures`, A and B.

## Step 4:

Download the WhackerLink files from this github repo onto your PC.

## Step 5:

Setup the config files. Rename the `config.example.yml` file to `config.yml` and open it in notepad or your favorite code editor. Also rename the `rcon_logins.example.yml` to just `rcon_logins.yml`.

## Step 6:

Put the google json file into the root directory of whackerlink and rename it to `google.json`. Open the `config.yml` file and under the `‘sheetsJson: './something-124.json'` change `‘./something-124.json’` to `‘google.json’`. Under the sheetsID put the google sheet that the rids and channels are listed in. The ID should look something like this: `14KmRdIIGcLWQnM4sWBKFxJOmqj7-Mh0vXO8taKsEgJU`.

## Step 7:

Copy the directory your whackerlink files are in and open CMD. Run the command `cd "directory"` and then put the location of the folder in there and hit enter. After that run `npm i` and then `node index.js -c config.yml` and go to `http://localhost:3000` that whackerlink is running on.

## Step 8:

Enjoy whackerlink. Use `/sys_view` and `/sys_view/admin` at the end of the URL to look at status. Example: `http://localhost:3000/sys_view`

## Images:

![A](https://github.com/VALER24/wl_images/blob/main/a.png?raw=true)
