# Etapa 1: compilar el jar
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q -DskipTests package

# Etapa 2: imagen de ejecucion
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 1001 krate && mkdir -p /data/uploads && chown -R krate:krate /data
COPY --from=build /app/target/*.jar app.jar
ENV APP_UPLOAD_DIR=/data/uploads \
    SPRING_DOCKER_COMPOSE_ENABLED=false
VOLUME /data/uploads
EXPOSE 8080
USER krate
ENTRYPOINT ["java", "-jar", "app.jar"]
