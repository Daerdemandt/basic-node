FROM node:argon

MAINTAINER Roman Kuzmichev daerdemandt@gmail.com

# Install nodemon
RUN npm install -g nodemon

# TODO: set proper USER

# Create app directory
RUN mkdir -p /app
WORKDIR /app

# Install app dependencies
COPY package.json /app/
RUN npm install

# Bundle app source
COPY . /app

# Expose port
EXPOSE  8080

# Run app using nodemon
CMD ["nodemon", "/app/index.js"]
