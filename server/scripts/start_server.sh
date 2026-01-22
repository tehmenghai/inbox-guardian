#!/bin/bash
cd /home/ec2-user/inbox-guardian-server
pm2 start ecosystem.config.js
pm2 save
