FROM node:24-slim AS builder


WORKDIR /app
COPY package*.json /app/

ARG REACT_APP_BACKEND_URL 
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL} 

RUN npm install

COPY . .
RUN  npm run build

FROM nginx:stable-alpine AS production


COPY --from=builder /app/build /usr/share/nginx/html

COPY default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]