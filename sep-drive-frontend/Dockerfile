# Stage 1: Build the Angular application
FROM node:18 AS build
WORKDIR /app
# Kopiere package.json und package-lock.json
COPY package*.json ./
# Installiere Dependencies mit der Option, um Peer-Konflikte zu ignorieren
RUN npm install
# NEU: Prüfen, ob Leaflet-Dateien nach Install vorhanden sind
# Kopiere den Rest des Quellcodes
COPY . .
# Baue die Anwendung für Produktion
# Der Output-Pfad ist normalerweise 'dist/projekt-name', prüfe ggf. angular.json
RUN npm run build -- --configuration production

# Stage 2: Serve the application with Nginx
FROM nginx:alpine
# Kopiere die gebauten Dateien aus der Build-Stage in den Nginx Web-Root
# Stelle sicher, dass der Pfad '/app/dist/sep-drive-frontend/browser' mit deinem outputPath in angular.json übereinstimmt!
COPY --from=build /app/dist/sep-drive-frontend/browser /usr/share/nginx/html
# Kopiere deine benutzerdefinierte Nginx-Konfiguration
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# Standard-Nginx-Entrypoint wird verwendet (startet Nginx)
