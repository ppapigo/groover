package com.groover.auth;

import com.groover.auth.dto.AuthResponse;
import com.groover.auth.dto.CsrfResponse;
import com.groover.auth.dto.LoginRequest;
import com.groover.auth.dto.RegisterRequest;
import com.groover.auth.dto.UserResponse;
import com.groover.common.dto.ApiResponse;
import com.groover.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.web.csrf.CsrfToken;
import java.util.UUID;

@RestController @RequestMapping("/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService service;
    private final AuthSessionService sessions;
    private final AuthCookies cookies;
    @GetMapping("/csrf") ApiResponse<CsrfResponse> csrf(CsrfToken csrf, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store");
        return ApiResponse.ok(new CsrfResponse(csrf.getToken()));
    }
    @PostMapping("/register") ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletResponse response) {
        var grant = service.register(request); cookies.set(response, grant); return ApiResponse.created(grant.response());
    }
    @PostMapping("/login") ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        var grant = service.login(request); cookies.set(response, grant); return ApiResponse.ok(grant.response());
    }
    @PostMapping("/refresh") ApiResponse<AuthResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        var grant = sessions.refresh(cookies.read(request));
        if (grant.isEmpty()) { cookies.clear(response); throw new BadCredentialsException("인증이 필요합니다."); }
        cookies.set(response, grant.get()); return ApiResponse.ok(grant.get().response());
    }
    @GetMapping("/me") ApiResponse<UserResponse> me(@AuthenticationPrincipal User user) { return ApiResponse.ok(UserResponse.from(user)); }
    @PostMapping("/logout") ApiResponse<Void> logout(@AuthenticationPrincipal User user, Authentication authentication,
                                                HttpServletRequest request, HttpServletResponse response) {
        if (user != null) sessions.logout(user.getId(), (UUID) authentication.getDetails());
        else sessions.logoutByRefresh(cookies.read(request));
        cookies.clear(response);
        return new ApiResponse<>(true, null, "로그아웃되었습니다.");
    }
    @PostMapping("/logout-all") ApiResponse<Void> logoutAll(@AuthenticationPrincipal User user, HttpServletResponse response) {
        sessions.logoutAll(user.getId()); cookies.clear(response);
        return new ApiResponse<>(true, null, "모든 기기에서 로그아웃되었습니다.");
    }
}
