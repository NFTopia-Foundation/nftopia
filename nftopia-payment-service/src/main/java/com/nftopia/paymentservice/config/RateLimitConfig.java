// package com.nftopia.paymentservice.config;

// import io.github.bucket4j.Bandwidth;
// import io.github.bucket4j.Bucket;
// import io.github.bucket4j.BucketConfiguration;
// import io.github.bucket4j.Refill;
// import io.github.bucket4j.distributed.proxy.ProxyManager;
// import io.github.bucket4j.redis.lettuce.LettuceProxyManager;
// import org.springframework.beans.factory.annotation.Value;
// import org.springframework.context.annotation.Bean;
// import org.springframework.context.annotation.Configuration;
// import org.springframework.web.context.annotation.RequestScope;
// import org.springframework.web.context.request.RequestContextHolder;
// import org.springframework.web.context.request.ServletRequestAttributes;
// import jakarta.servlet.http.HttpServletRequest;
// import java.time.Duration;
// import java.util.concurrent.ConcurrentHashMap;

// @Configuration
// public class RateLimitConfig {
    
//     @Value("${webhook.rate.limit.requests:100}")
//     private int maxRequests;
    
//     @Value("${webhook.rate.limit.duration:60}")
//     private int durationSeconds;
    
//     private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    
//     @Bean
//     public ProxyManager<String> proxyManager() {
//         // For now, using in-memory storage. In production, use Redis
//         return ProxyManager.builder()
//                 .withCache(new ConcurrentHashMap<>())
//                 .build();
//     }
    
//     public boolean allowRequest() {
//         String clientIp = getClientIp();
//         Bucket bucket = buckets.computeIfAbsent(clientIp, this::createBucket);
//         return bucket.tryConsume(1);
//     }
    
//     private Bucket createBucket(String key) {
//         Bandwidth limit = Bandwidth.classic(maxRequests, Refill.greedy(maxRequests, Duration.ofSeconds(durationSeconds)));
//         return Bucket.builder()
//                 .addLimit(limit)
//                 .build();
//     }
    
//     private String getClientIp() {
//         try {
//             ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
//             if (attributes != null) {
//                 HttpServletRequest request = attributes.getRequest();
//                 String xForwardedFor = request.getHeader("X-Forwarded-For");
//                 if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
//                     return xForwardedFor.split(",")[0].trim();
//                 }
//                 return request.getRemoteAddr();
//             }
//         } catch (Exception e) {
//             // Fallback to a default IP if we can't determine the client IP
//         }
//         return "unknown";
//     }
// } 