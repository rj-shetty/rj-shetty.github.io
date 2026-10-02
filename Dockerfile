FROM node:20-alpine
WORKDIR /app
COPY index.html os.css portfolio.js server.js robots.txt ./
COPY assets ./assets
COPY js/portfolio-data.js ./js/portfolio-data.js
EXPOSE 3000
CMD ["node", "server.js"]
