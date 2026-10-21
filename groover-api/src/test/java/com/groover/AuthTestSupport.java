package com.groover;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.web.client.RestTemplate;
import java.util.ArrayList;

final class AuthTestSupport {
    private AuthTestSupport() {}
    static void enableCsrf(TestRestTemplate http) {
        var interceptors = new ArrayList<>(http.getRestTemplate().getInterceptors());
        if (interceptors.stream().anyMatch(Csrf.class::isInstance)) return;
        interceptors.add(new Csrf());
        http.getRestTemplate().setInterceptors(interceptors);
    }
    private static final class Csrf implements ClientHttpRequestInterceptor {
        @Override public org.springframework.http.client.ClientHttpResponse intercept(
                org.springframework.http.HttpRequest request, byte[] body,
                org.springframework.http.client.ClientHttpRequestExecution execution) throws java.io.IOException {
            if (request.getMethod() == HttpMethod.POST && request.getURI().getPath().contains("/auth/")) {
                var uri = request.getURI().resolve("/v1/auth/csrf");
                var csrf = new RestTemplate().getForEntity(uri, JsonNode.class);
                request.getHeaders().set("X-CSRF-TOKEN", csrf.getBody().path("data").path("token").asText());
                for (String cookie : csrf.getHeaders().getOrEmpty(HttpHeaders.SET_COOKIE))
                    request.getHeaders().add(HttpHeaders.COOKIE, cookie.split(";", 2)[0]);
            }
            return execution.execute(request, body);
        }
    }
}
