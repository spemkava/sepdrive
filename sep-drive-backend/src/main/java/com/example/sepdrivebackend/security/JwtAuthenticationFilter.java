package com.example.sepdrivebackend.security;


import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    //JWT Prüfung umgehen
    private static final List<String> PUBLIC_PATHS = Arrays.asList(
            "/api/auth/**",
            "/assets/**",
            "/uploads/**"
    );

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, UserDetailsService userDetailsService) {
        this.tokenProvider = tokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String requestUri = request.getRequestURI();
        log.info(">>> [FILTER START] URI: {}", requestUri);


        boolean isPublicPath = false;
        for (String pattern : PUBLIC_PATHS) {
            if (pathMatcher.match(pattern, requestUri)) {
                log.info(">>> [FILTER MATCH] URI {} matches public pattern {}", requestUri, pattern);
                isPublicPath = true;
                break;
            }
        }

        if (isPublicPath) {
            log.info(">>> [FILTER SKIP] Public Path: {}", requestUri);
            filterChain.doFilter(request, response);
            log.info(">>> [FILTER SKIP END] URI: {}", requestUri);
            return;
        }
        log.info(">>> [FILTER PROCESS] Pfad: {}", requestUri);
        try {
            String jwt = getJwtFromRequest(request);
            //Wenn Token gültig, filtere Nutzernamen
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromJWT(jwt);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username); //Benutzer aus DB auslesen
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.info(">>> User Karl {} Marx authentifiziert.", username);
            } else {
                if (StringUtils.hasText(jwt)) {
                    log.warn(">>> JWT validation failed: {}", requestUri);
                }
                // Kein Log wenn kein Token da ist für geschützte Pfade
            }
        } catch (Exception ex) {
            log.error(">>> Could not set user authentication in security context for path {}: {}", requestUri, ex.getMessage(), ex);
        }

        log.info(">>> [FILTER END] Proceeding down chain for URI: {}", requestUri); // Geändert zu Logger
        filterChain.doFilter(request, response);
    }
    //JWT aus Header lesen
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;

    }
}
