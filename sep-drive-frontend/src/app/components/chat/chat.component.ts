// src/app/components/chat/chat.component.ts
@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  messages: ChatMessageDto[] = [];
  draft = '';

  constructor(private chat: ChatSocketService,
              private auth: AuthService) {}

  ngOnInit() {
    this.chat.connect(this.auth.token);
    this.chat.stream().subscribe(m => m && this.updateLocal(m));
  }

  send() {
    const msg: ChatMessageDto = {
      senderId: this.auth.userId,
      recipientId: this.partnerId,
      content: this.draft,
      status: 'SENT',
      edited: false,
      deleted: false,
      timestamp: new Date().toISOString()
    };
    this.chat.send(msg);
    this.draft = '';
  }

  /* edit / delete Buttons im Template rufen diese auf */
  edit(msg: ChatMessageDto) {
    this.chat.edit(msg.id!, 'neuer Text …');
  }

  del(msg: ChatMessageDto) {
    this.chat.delete(msg.id!);
  }

  markRead(msg: ChatMessageDto) {
    if (msg.status !== 'READ') this.chat.readAck(msg.id!);
  }

  private updateLocal(remote: ChatMessageDto) {
    const idx = this.messages.findIndex(m => m.id === remote.id);
    if (idx === -1) this.messages.push(remote);
    else this.messages[idx] = remote;
  }
}
