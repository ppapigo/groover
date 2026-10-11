package com.groover.common;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(EntityNotFoundException.class)
    ResponseEntity<?> notFound(EntityNotFoundException e) { return error(HttpStatus.NOT_FOUND, e.getMessage()); }
    @ExceptionHandler({IllegalArgumentException.class, MethodArgumentNotValidException.class})
    ResponseEntity<?> badRequest(Exception e) {
        String message = e instanceof MethodArgumentNotValidException v
                ? v.getBindingResult().getFieldErrors().stream().findFirst().map(x -> x.getField() + ": " + x.getDefaultMessage()).orElse("잘못된 요청입니다.")
                : e.getMessage();
        return error(HttpStatus.BAD_REQUEST, message);
    }
    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<?> forbidden(AccessDeniedException e) { return error(HttpStatus.FORBIDDEN, e.getMessage()); }
    private ResponseEntity<?> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("success", false, "message", message));
    }
}
