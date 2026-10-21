package com.groover.config;

import com.groover.auth.JwtAuthenticationFilter;
import com.groover.auth.AuthRateLimitFilter;
import com.groover.common.SecurityResponses;
import jakarta.servlet.DispatcherType;
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
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
@EnableMethodSecurity
@EnableScheduling
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwt, AuthRateLimitFilter rateLimit,
                                         @Value("${app.auth.secure-cookies:true}") boolean secureCookies) throws Exception {
        var csrf = new CookieCsrfTokenRepository();
        csrf.setCookieName(secureCookies ? "__Host-groover-csrf" : "groover-csrf");
        csrf.setHeaderName("X-CSRF-TOKEN");
        csrf.setCookieCustomizer(cookie -> cookie.path("/").secure(secureCookies).httpOnly(true).sameSite("Strict"));
        var cookieActions = Set.of("/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/logout-all");
        // Regular API calls only authenticate with Bearer. Cookie-based auth actions require CSRF.
        return http.csrf(c -> c.csrfTokenRepository(csrf)
                        .requireCsrfProtectionMatcher(request -> "POST".equals(request.getMethod()) && cookieActions.contains(request.getServletPath())))
                .cors(c -> {}).sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .httpBasic(c -> c.disable()).formLogin(c -> c.disable()).logout(c -> c.disable()).requestCache(c -> c.disable())
                .authorizeHttpRequests(a -> a
                        .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.POST, "/auth/register", "/auth/login", "/auth/refresh", "/auth/logout").permitAll()
                        .requestMatchers(HttpMethod.GET, "/health", "/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.GET, "/blog/feed/**", "/blog/posts/*", "/blog/posts/*/comments", "/blog/tags/popular", "/tags/**", "/search/**").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> SecurityResponses.write(res, 401, "인증이 필요합니다."))
                        .accessDeniedHandler((req, res, ex) -> SecurityResponses.write(res, 403,
                                ex instanceof org.springframework.security.web.csrf.CsrfException
                                        ? "요청 보안 검증에 실패했습니다." : "접근 권한이 없습니다.")))
                .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimit, JwtAuthenticationFilter.class).build();
    }
    @Bean UrlBasedCorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String origins) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).toList());
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept", "X-CSRF-TOKEN"));
        c.setExposedHeaders(List.of("Retry-After")); c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**", c); return source;
    }
    @Bean FilterRegistrationBean<JwtAuthenticationFilter> jwtRegistration(JwtAuthenticationFilter filter) {
        var registration = new FilterRegistrationBean<>(filter); registration.setEnabled(false); return registration;
    }
    @Bean FilterRegistrationBean<AuthRateLimitFilter> rateLimitRegistration(AuthRateLimitFilter filter) {
        var registration = new FilterRegistrationBean<>(filter); registration.setEnabled(false); return registration;
    }
}
