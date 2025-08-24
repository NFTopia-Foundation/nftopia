package com.nftopia.paymentservice.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.config.Customizer;


@Configuration
@EnableWebSecurity
public class SecurityConfig {


    @Bean
    public InMemoryUserDetailsManager userDetailsService(PasswordEncoder encoder) {
        UserDetails user = User.withUsername("admin")
                               .password(encoder.encode("secret"))
                               .roles("ADMIN")
                               .build();
        return new InMemoryUserDetailsManager(user);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }


   @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
       
        http
        .csrf(csrf -> csrf.disable())  // disable CSRF for APIs
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/**").permitAll() // public
            .anyRequest().authenticated()          // protected
        )
        .httpBasic(Customizer.withDefaults()); // enable HTTP Basic
        return http.build();
    }
}
