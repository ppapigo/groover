FROM maven:3.9.11-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q -DskipTests dependency:go-offline
COPY src src
RUN mvn -B -q package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk upgrade --no-cache \
    && apk del coreutils \
    && addgroup -g 10001 app && adduser -D -u 10001 -G app app
COPY --from=build --chown=10001:10001 /app/target/groover-api-1.0.0.jar app.jar
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/v1/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
