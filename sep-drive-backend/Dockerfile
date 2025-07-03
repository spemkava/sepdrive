FROM maven:3-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .

RUN mvn -B dependency:go-offline
COPY src ./src

RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

COPY --from=build /app/target/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]