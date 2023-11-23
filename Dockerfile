FROM node:lts-alpine
ENV NODE_ENV=production
ENV SPOTIFY_CLIENT_ID=9ae37906920c4430ac7d56fea5a181e7
ENV SPOTIFY_CLIENT_SECRET=b096270907fd4db99739a78c843c099a
ENV API_KEY=AIzaSyDip2ERAhJXWPZhVP3gEBWxeCkkL40yYW8
ENV AUTH_DOMAIN=biblioteca-dc1e4.firebaseapp.com
ENV DATABASE_URL=https://biblioteca-dc1e4-default-rtdb.firebaseio.com
ENV PROJECT_ID=biblioteca-dc1e4
ENV STORAGE_BUCKET=biblioteca-dc1e4.appspot.com
ENV MESSAGING_SENDER_ID=361700647069
ENV APP_ID=1:361700647069:web:42db4d2aca129ecba07474
ENV MEASUREMENT_ID=G-P5WMKEXMLC
ENV EMOJI_API_KEY=61feff06b6fc762ec668e274fc1fbcb92dc27384
ENV IG_CLIENT_ID=635927228482071
ENV IG_REDIRECT_URI=https://localhost:4000/auth_Ig/callback
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE 4000
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]
