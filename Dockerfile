FROM node:15

RUN apt-get -y update
RUN apt-get -y upgrade
RUN apt-get install -y ffmpeg

WORKDIR /var/app

RUN yarn install

COPY . .

CMD ["yarn", "run", "dev"]
