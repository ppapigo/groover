package com.groover.common;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.groover.common.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

public final class SecurityResponses {
    private static final ObjectWriter ERRORS = new ObjectMapper().writerFor(ErrorResponse.class);
    private SecurityResponses() {}
    public static void write(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Cache-Control", "no-store");
        response.getWriter().write(ERRORS.writeValueAsString(ErrorResponse.error(message)));
    }
}
