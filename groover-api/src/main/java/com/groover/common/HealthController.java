package com.groover.common;

import com.groover.common.dto.HealthResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {
    @GetMapping("/health") HealthResponse health() { return new HealthResponse("UP"); }
}
