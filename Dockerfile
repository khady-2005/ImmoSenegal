# Image du backend construite depuis la RACINE du dépôt (utilisée par Render, sans réglage « Root Directory »).
# Même contenu que backend/Dockerfile ; seuls les chemins de COPY changent (préfixe backend/).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn -B -q dependency:go-offline
COPY backend/src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre
RUN useradd --system --create-home appuser
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
USER appuser
# Offre gratuite à ~512 Mo de mémoire : on borne la JVM.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+UseSerialGC -Xss512k"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
