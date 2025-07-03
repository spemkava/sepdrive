package com.example.sepdrivebackend.service;


import org.springframework.stereotype.Service;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;


//"Wrapper" Klasse für Inhalt, Fehlerbehandlung + Debugging
@Service
public class EmailService {


    //spring-boot-starter-mail Bean, SMTP per application.properties
    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) { this.mailSender = mailSender; }

    public void sendSimpleMessage(String to, String subject, String text) {

            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);

            mailSender.send(message);



    }
    
}
