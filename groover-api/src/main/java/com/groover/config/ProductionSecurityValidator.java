package com.groover.config;

import com.groover.auth.JwtService;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;
import java.util.Locale;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

@Component
@Profile("prod")
public class ProductionSecurityValidator {
    public ProductionSecurityValidator(Environment environment) { validate(environment); }
    public static void validate(Environment env) {
        if (env.acceptsProfiles(Profiles.of("dev"))) fail("Do not combine prod and dev profiles.");
        if (!env.getProperty("app.auth.secure-cookies", Boolean.class, true)) fail("Production authentication cookies must be Secure.");
        String password = env.getProperty("spring.datasource.password", "");
        String lower = password.toLowerCase(Locale.ROOT);
        if (password.length() < 24 || password.chars().distinct().count() < 10
                || lower.contains("password") || lower.contains("changeme") || lower.contains("groover")
                || lower.contains("development") || lower.contains("change-this"))
            fail("A securely generated DATABASE_PASSWORD of at least 24 characters is required.");
        String url = env.getProperty("spring.datasource.url", "");
        if (!url.startsWith("jdbc:postgresql:") || url.toLowerCase(Locale.ROOT).contains("password="))
            fail("A PostgreSQL DATABASE_URL without embedded credentials is required.");
        if (env.getProperty("spring.datasource.username", "").isBlank()) fail("DATABASE_USERNAME is required.");
        JwtService.keyFromSecret(env.getProperty("app.jwt.secret", ""));
        String decodedKey = new String(Base64.getDecoder().decode(env.getProperty("app.jwt.secret")),
                StandardCharsets.ISO_8859_1).toLowerCase(Locale.ROOT);
        if (decodedKey.contains("test-only") || decodedKey.contains("development")
                || decodedKey.contains("change-this") || decodedKey.contains("password"))
            fail("Production JWT_SECRET must not be a known test or development key.");
        if (!"https://groover.grooverapp.com".equals(env.getProperty("app.cors.allowed-origins")))
            fail("Production CORS must allow only https://groover.grooverapp.com.");
        if (!"validate".equals(env.getProperty("spring.jpa.hibernate.ddl-auto"))
                || !env.getProperty("spring.flyway.enabled", Boolean.class, false)
                || !env.getProperty("spring.flyway.clean-disabled", Boolean.class, false))
            fail("Production requires Flyway and ddl-auto=validate, with Flyway clean disabled.");
        if (!"none".equals(env.getProperty("server.forward-headers-strategy")))
            fail("Forwarded headers must only be processed by the explicit trusted proxy resolver.");
        if (env.getProperty("app.security.trusted-proxies", "").isBlank())
            fail("The exact internal web proxy IP must be configured.");
    }
    private static void fail(String message) { throw new IllegalStateException(message); }
}
