#!/bin/bash
cd /home/ec2-user/inbox-guardian-server
npm ci --production
npm run build
