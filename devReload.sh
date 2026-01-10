
npm run build
pm2 delete gameplay-service && pm2 start ecosystem.config.js && pm2 logs
#npm run build && pm2 reload gameplay-service && pm2 logs gameplay-service