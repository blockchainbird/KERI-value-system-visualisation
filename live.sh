#!/bin/bash
# SIMPLE SCRIPT THAT COPIES FILES TO LIVE SITE
# INSTRUCTIONS
# adding --progress option to rsync command will output progress to screen

####################
# CREATE A BUILD
npm run build

# COPY TO LIVE SERVER
rsync -vurt dist/. dwarshuiscom@ssh.dwarshuis.com:/data/sites/web/dwarshuiscom/www/test/KERI-value-system-visualisation/
