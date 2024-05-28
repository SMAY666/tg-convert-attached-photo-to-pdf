FROM node:20

RUN mkdir -p /app
WORKDIR /app

COPY package.json yarn.lock  ./
RUN yarn install --immutable

COPY . .

RUN yarn build

RUN rm -rf src

CMD ["yarn", "start"]
