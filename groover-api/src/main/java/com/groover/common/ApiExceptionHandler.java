package com.groover.common;

import com.groover.common.dto.ErrorResponse;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import com.groover.auth.RateLimitException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.TransactionException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<ErrorResponse> notFound(EntityNotFoundException e) { return error(HttpStatus.NOT_FOUND, e.getMessage()); }
    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class,
            ConstraintViolationException.class, HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ErrorResponse> badRequest(Exception e) {
        String message = e.getClass() == IllegalArgumentException.class ? e.getMessage() : "입력값을 확인해주세요.";
        return error(HttpStatus.BAD_REQUEST, message);
    }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ErrorResponse> forbidden(AccessDeniedException e) { return error(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."); }
    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ErrorResponse> unauthorized(AuthenticationException e) { return error(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않거나 인증이 필요합니다."); }
    @ExceptionHandler(RateLimitException.class)
    ResponseEntity<ErrorResponse> limited(RateLimitException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).header("Retry-After", Long.toString(e.retryAfter()))
                .body(ErrorResponse.error(e.getMessage()));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> conflict(DataIntegrityViolationException e) { return error(HttpStatus.CONFLICT, "이미 사용 중이거나 처리된 요청입니다."); }
    @ExceptionHandler({DataAccessException.class, TransactionException.class})
    ResponseEntity<ErrorResponse> unavailable(Exception e) { return error(HttpStatus.SERVICE_UNAVAILABLE, "잠시 후 다시 시도해주세요."); }
    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> unexpected(Exception e) { return error(HttpStatus.INTERNAL_SERVER_ERROR, "요청을 처리하지 못했습니다."); }
    private ResponseEntity<ErrorResponse> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(ErrorResponse.error(message));
    }
}
