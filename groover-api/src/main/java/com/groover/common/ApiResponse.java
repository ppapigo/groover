package com.groover.common;

public record ApiResponse<T>(boolean success, T data, String message) {
    public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(true, data, null); }
    public static <T> ApiResponse<T> created(T data) { return new ApiResponse<>(true, data, "생성되었습니다."); }
}
