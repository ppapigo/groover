package com.groover;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import java.sql.DriverManager;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;

class FlywayMigrationTests {
    @Test void v1DataSurvivesTheAdditiveSecurityMigration() throws Exception {
        String url = System.getProperty("security.test.database-url",
                "jdbc:h2:mem:migration-test;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH");
        String user = System.getProperty("security.test.database-user", "sa");
        String password = System.getenv().getOrDefault("GROOVER_TEST_DB_PASSWORD", "");
        String schema = "migration_" + UUID.randomUUID().toString().replace("-", "");
        var baseline = Flyway.configure().dataSource(url, user, password).schemas(schema).defaultSchema(schema)
                .locations("classpath:db/migration").target("1").cleanDisabled(true).load();
        baseline.migrate();
        String id = UUID.randomUUID().toString();
        try (var connection = DriverManager.getConnection(url, user, password)) {
            connection.setSchema(schema);
            try (var insert = connection.prepareStatement("INSERT INTO users (id,user_id,email,password_hash,name,created_at,updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)")) {
                insert.setObject(1, UUID.fromString(id)); insert.setString(2, "existing_user");
                insert.setString(3, "existing@example.com"); insert.setString(4, "existing-hash"); insert.setString(5, "Existing user");
                insert.executeUpdate();
            }
        }
        var upgraded = Flyway.configure().dataSource(url, user, password).schemas(schema).defaultSchema(schema)
                .locations("classpath:db/migration").cleanDisabled(true).load();
        assertThat(upgraded.migrate().migrationsExecuted).isEqualTo(2);
        upgraded.validate();
        assertThat(upgraded.migrate().migrationsExecuted).isZero();
        try (var connection = DriverManager.getConnection(url, user, password)) {
            connection.setSchema(schema);
            try (var query = connection.createStatement(); var result = query.executeQuery("SELECT email, password_hash FROM users WHERE user_id = 'existing_user'")) {
                assertThat(result.next()).isTrue();
                assertThat(result.getString(1)).isEqualTo("existing@example.com");
                assertThat(result.getString(2)).isEqualTo("existing-hash");
            }
            try (var query = connection.createStatement(); var result = query.executeQuery("SELECT COUNT(*) FROM auth_rate_limit_locks")) {
                assertThat(result.next()).isTrue(); assertThat(result.getInt(1)).isEqualTo(64);
            }
            try (var query = connection.createStatement(); var result = query.executeQuery("SELECT COUNT(*) FROM auth_sessions")) {
                assertThat(result.next()).isTrue(); assertThat(result.getInt(1)).isZero();
            }
        }
    }
}
