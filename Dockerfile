# Use official Node.js LTS image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first (to leverage Docker cache)
COPY package*.json ./

# Copy .env early (before npm install, in case dependencies need it)
#COPY .env .env

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the app port
EXPOSE 1111

# Start the application
CMD ["npm", "start"]
