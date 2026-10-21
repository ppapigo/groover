package com.groover.config;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.InitializingBean;

@Component
@Profile("prod")
public class ProductionDatabaseValidator implements InitializingBean {
    private final JdbcTemplate jdbc;
    public ProductionDatabaseValidator(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    @Override public void afterPropertiesSet() {
        Boolean privileged = jdbc.queryForObject(
                "SELECT rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication FROM pg_roles WHERE rolname = current_user",
                Boolean.class);
        if (!Boolean.FALSE.equals(privileged))
            throw new IllegalStateException("Production API must use an unprivileged PostgreSQL application role.");
    }
}
