FROM node:15

RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y ffmpeg

WORKDIR /var/app

# COPY . .
# COPY /pages .
# COPY /public .
# COPY /*

RUN yarn install && yarn build

CMD ["yarn", "run", "start"]
