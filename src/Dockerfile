# Use Java image
FROM openjdk:17

# Set working directory
WORKDIR /app

# Copy jar file
COPY target/payroll-mongodb-1.0-SNAPSHOT.jar app.jar

# Run application
CMD ["java", "-jar", "app.jar"]