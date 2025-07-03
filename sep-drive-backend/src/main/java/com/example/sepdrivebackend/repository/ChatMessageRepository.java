package com.example.sepdrivebackend.repository;

import com.example.sepdrivebackend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /**
     * Findet alle Nachrichten für einen bestimmten Chat (Fahranfrage)
     */
    List<ChatMessage> findByChatIdOrderByTimestampAsc(String chatId);

    /**
     * Findet alle Nachrichten für einen Chat, bei denen der User Sender oder Empfänger ist
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatId = :chatId " +
           "AND (cm.sender.id = :userId OR cm.recipient.id = :userId) " +
           "ORDER BY cm.timestamp ASC")
    List<ChatMessage> findByChatIdAndUser(@Param("chatId") String chatId, @Param("userId") Long userId);

    /**
     * Findet alle ungelesenen Nachrichten für einen Benutzer
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.recipient.id = :userId " +
           "AND cm.status IN ('SENT', 'DELIVERED') ORDER BY cm.timestamp ASC")
    List<ChatMessage> findUnreadMessagesByUser(@Param("userId") Long userId);

    /**
     * Zählt ungelesene Nachrichten für einen Benutzer
     */
    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.recipient.id = :userId " +
           "AND cm.status IN ('SENT', 'DELIVERED')")
    Long countUnreadMessagesByUser(@Param("userId") Long userId);

    /**
     * Findet alle Nachrichten zwischen zwei Benutzern
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE " +
           "(cm.sender.id = :user1Id AND cm.recipient.id = :user2Id) OR " +
           "(cm.sender.id = :user2Id AND cm.recipient.id = :user1Id) " +
           "ORDER BY cm.timestamp ASC")
    List<ChatMessage> findMessagesBetweenUsers(@Param("user1Id") Long user1Id, @Param("user2Id") Long user2Id);

    /**
     * Findet die letzte Nachricht für einen Chat
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.chatId = :chatId " +
           "ORDER BY cm.timestamp DESC LIMIT 1")
    ChatMessage findLastMessageByChatId(@Param("chatId") String chatId);

    /**
     * Findet alle Chats, an denen ein Benutzer beteiligt ist
     */
    @Query("SELECT DISTINCT cm.chatId FROM ChatMessage cm WHERE " +
           "cm.sender.id = :userId OR cm.recipient.id = :userId")
    List<String> findChatIdsByUser(@Param("userId") Long userId);
}