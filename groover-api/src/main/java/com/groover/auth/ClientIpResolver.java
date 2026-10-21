package com.groover.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.*;

@Component
public class ClientIpResolver {
    private final Set<String> trusted;
    public ClientIpResolver(@Value("${app.security.trusted-proxies:}") String proxies) {
        trusted = new HashSet<>();
        for (String proxy : proxies.split(",")) {
            if (proxy.isBlank()) continue;
            String address = normalize(proxy.trim());
            if (address == null) throw new IllegalStateException("Trusted proxies must be explicit IP addresses.");
            trusted.add(address);
        }
    }
    public String resolve(HttpServletRequest request) {
        String peer = normalize(request.getRemoteAddr());
        if (peer == null) return "unknown";
        if (trusted.contains(peer)) {
            var forwarded = Collections.list(request.getHeaders("X-Forwarded-For"));
            // The trusted web proxy must replace (not append to) this header.
            if (forwarded.size() == 1) {
                String client = normalize(forwarded.getFirst());
                if (client != null) return client;
            }
        }
        return peer;
    }
    private String normalize(String value) {
        if (value == null || value.length() > 45 || !value.matches("[0-9a-fA-F:.]+")) return null;
        try { return InetAddress.getByName(value).getHostAddress(); }
        catch (UnknownHostException e) { return null; }
    }
}
