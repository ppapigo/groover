package com.groover.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByUserId(String userId);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByUserId(String userId);
    @Query(value = """
            SELECT u.* FROM users u JOIN auth_sessions s ON s.user_id=u.id
            WHERE u.id=:userId AND s.id=:sessionId AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP
            """, nativeQuery = true)
    Optional<User> findActiveSessionUser(@Param("userId") UUID userId, @Param("sessionId") UUID sessionId);
}
