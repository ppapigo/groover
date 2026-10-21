package com.groover.auth;

import com.groover.common.SecurityResponses;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.TransactionException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
@RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private final AuthRateLimiter limiter;
    private final ClientIpResolver clients;
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        // Use the container-decoded path, like MVC/Security, so encoded letters cannot evade the IP limit.
        String path = request.getServletPath();
        if ("POST".equals(request.getMethod()) && ("/auth/login".equals(path) || "/auth/register".equals(path) || "/auth/refresh".equals(path))) {
            try {
                int limit = path.endsWith("refresh") ? 120 : path.endsWith("login") ? 60 : 10;
                limiter.consume(path + ":ip", clients.resolve(request), limit, 900);
            } catch (RateLimitException e) {
                response.setHeader("Retry-After", Long.toString(e.retryAfter()));
                SecurityResponses.write(response, 429, e.getMessage());
                return;
            } catch (DataAccessException | TransactionException e) {
                // Fail closed: a limiter outage must not enable unrestricted password attempts.
                SecurityResponses.write(response, 503, "잠시 후 다시 시도해주세요.");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
