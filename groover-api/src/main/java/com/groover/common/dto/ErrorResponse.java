package com.groover.common.dto;

public record ErrorResponse(boolean success, String message) {
    public static ErrorResponse error(String message) {
        return new ErrorResponse(false, message);
    }
}
