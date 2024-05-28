FROM node:20

RUN mkdir -p /app
RUN mkdir /app/uploads

WORKDIR /app

COPY package.json yarn.lock  ./
RUN yarn install --immutable

COPY . .

RUN yarn build

RUN rm -rf src

CMD ["yarn", "start"]
