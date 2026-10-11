package com.groover.auth;

import com.groover.common.ApiResponse;
import com.groover.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService service;
    @PostMapping("/register") ApiResponse<?> register(@Valid @RequestBody AuthDtos.RegisterRequest request) { return ApiResponse.created(service.register(request)); }
    @PostMapping("/login") ApiResponse<?> login(@Valid @RequestBody AuthDtos.LoginRequest request) { return ApiResponse.ok(service.login(request)); }
    @GetMapping("/me") ApiResponse<?> me(@AuthenticationPrincipal User user) { return ApiResponse.ok(AuthDtos.UserResponse.from(user)); }
    @PostMapping({"/logout", "/logout-all"}) ApiResponse<?> logout() { return ApiResponse.ok(null); }
}
