@Entity
public class ChatMessage {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String chatId;          // ← NEU  (z. B. Fahranfrage-ID)

    private Long senderId;
    private Long recipientId;

    @Column(length = 2000)
    private String content;

    @Enumerated(EnumType.STRING)
    private MessageStatus status = MessageStatus.SENT;

    private boolean edited = false;  // ← NEU
    private boolean deleted = false; // ← NEU

    private Instant timestamp = Instant.now();

    /* ---- Getter & Setter (vollständig) ---- */
    // … id, senderId, recipientId, content …

    public String getChatId()            { return chatId; }
    public void   setChatId(String c)    { this.chatId = c; }

    public boolean isEdited()            { return edited; }
    public void   setEdited(boolean e)   { this.edited = e; }

    public boolean isDeleted()           { return deleted; }
    public void   setDeleted(boolean d)  { this.deleted = d; }

    public Instant getTimestamp()        { return timestamp; }
    public void   setTimestamp(Instant t){ this.timestamp = t; }
}
