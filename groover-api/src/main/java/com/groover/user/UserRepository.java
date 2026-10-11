package com.groover.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByUserId(String userId);
    boolean existsByEmailIgnoreCase(String email);
    boolean existsByUserId(String userId);
}
