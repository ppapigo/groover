package com.groover.config;

import com.groover.auth.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.*;
import java.util.*;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwt) throws Exception {
        return http.csrf(c -> c.disable()).cors(c -> {}).sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/auth/register", "/auth/login", "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/blog/feed/**", "/blog/posts/*", "/blog/posts/*/comments", "/blog/tags/popular", "/tags/**", "/search/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e.authenticationEntryPoint((req, res, ex) -> {
                    res.setStatus(HttpServletResponse.SC_UNAUTHORIZED); res.setContentType("application/json;charset=UTF-8");
                    res.getWriter().write("{\"success\":false,\"message\":\"인증이 필요합니다.\"}");
                })).addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class).build();
    }
    @Bean CorsConfigurationSource cors(@Value("${app.cors.allowed-origins}") String origins) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("*")); c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**", c); return source;
    }
}
