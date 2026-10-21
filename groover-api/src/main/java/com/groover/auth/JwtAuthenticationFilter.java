package com.groover.auth;

import com.groover.user.UserRepository;
import com.groover.common.SecurityResponses;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;
import java.util.Collections;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.TransactionException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var headers = Collections.list(request.getHeaders("Authorization"));
        if (!headers.isEmpty()) {
            String header = headers.getFirst();
            if (headers.size() != 1 || header.length() > 4096
                    || !header.matches("(?i)Bearer [a-z0-9_-]+\\.[a-z0-9_-]+\\.[a-z0-9_-]+")) {
                SecurityResponses.write(response, 401, "인증이 필요합니다.");
                return;
            }
            try {
                var identity = jwtService.parse(header.substring(7));
                var user = userRepository.findActiveSessionUser(identity.userId(), identity.sessionId()).orElse(null);
                if (user == null) throw new JwtException("Unknown subject.");
                var authentication = new UsernamePasswordAuthenticationToken(user, null, List.of());
                authentication.setDetails(identity.sessionId());
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (JwtException | IllegalArgumentException e) {
                SecurityContextHolder.clearContext();
                SecurityResponses.write(response, 401, "인증이 필요합니다.");
                return;
            } catch (DataAccessException | TransactionException e) {
                SecurityResponses.write(response, 503, "잠시 후 다시 시도해주세요.");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
