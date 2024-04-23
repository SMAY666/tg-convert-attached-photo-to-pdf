# tg-convert-attached-photo-to-pdf

Telegram bot for convert images to PDF file

# Preparation for use
1. Place bot token to BOT_TOKEN variable in .env file
2. Add WHITE_LIST variable in .env file like [example](#env-example)
3. Execute ``yarn install`` command

# How to use it

Execute ``yarn start`` command. If all is ok you will see `Bot started` message in the console.  
When the bot is running use "Menu" button or [commands](bot-commands) for interact with the bot. You can add multiple images in one message.  
Some time later after "done" command was sending bot will send to you `image2pdf.pdf` file.
The file will contain all photos you sent between "start" and "done" commands
# Env file example

```
BOT_TOKEN=your_bot_token
WHITE_LIST=username1,username2,username3...
```

# Bot commands

*/help* - use for get all bot commands and there description  
*/save* - use before sending images (Only before send first image or "/done" command called). Command serve as a flag for start to collect attached images  
*/photos* - use for get number of collected attachments  
*/done* - use after you added all images you want
