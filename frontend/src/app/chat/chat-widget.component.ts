import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ChatChannel, ChatMessage, UserChatProfile } from '../services/api.service';
import { AuthService } from '../auth.service';
import { SignalRService, UserTypingEvent, UserStatusEvent, MessagesReadEvent, ChannelUpdatedEvent } from '../services/signalr.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  isOpen = false;
  activeView: 'channels' | 'chat' | 'new-direct' | 'new-group' = 'channels';

  currentUserId = '';
  currentUserName = '';
  token = '';

  channels: ChatChannel[] = [];
  users: UserChatProfile[] = [];
  messages: ChatMessage[] = [];

  activeChannel: ChatChannel | null = null;
  messageText = '';

  // Search & Filter
  searchQuery = '';
  userSearchQuery = '';

  // Group creation
  newGroupName = '';
  selectedUserIds: string[] = [];

  // Real-time state
  typingUsers: { [channelId: number]: string } = {};
  private typingTimer: any = null;
  isSignalRConnected = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private signalRService: SignalRService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.user;
    if (user) {
      this.currentUserId = user.id || '';
      this.currentUserName = user.name || user.employeeName || user.email || 'Employee';
    }
    this.token = this.authService.getToken() || '';

    // Load initial user and channel data
    this.loadChannels();
    this.loadUsers();

    // Initialize SignalR WebSocket connection
    if (this.currentUserId) {
      this.signalRService.startConnection(this.token, this.currentUserId);
    }

    // Subscribe to SignalR events
    this.subscriptions.push(
      this.signalRService.isConnected$.subscribe(connected => {
        this.isSignalRConnected = connected;
      })
    );

    this.subscriptions.push(
      this.signalRService.receiveMessage$.subscribe(msg => {
        this.handleIncomingMessage(msg);
      })
    );

    this.subscriptions.push(
      this.signalRService.userStatusChanged$.subscribe(evt => {
        this.handleUserStatusChanged(evt);
      })
    );

    this.subscriptions.push(
      this.signalRService.userTyping$.subscribe(evt => {
        this.handleUserTyping(evt);
      })
    );

    this.subscriptions.push(
      this.signalRService.messagesRead$.subscribe(evt => {
        this.handleMessagesRead(evt);
      })
    );

    this.subscriptions.push(
      this.signalRService.channelUpdated$.subscribe(evt => {
        this.handleChannelUpdated(evt);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.signalRService.stopConnection();
  }

  toggleChat(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadChannels();
      this.loadUsers();
      if (this.activeChannel) {
        this.markChannelRead(this.activeChannel.id);
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) return;
    const target = event.target as HTMLElement;
    if (target && !this.elementRef.nativeElement.contains(target)) {
      this.closeChat();
    }
  }

  closeChat(): void {
    this.isOpen = false;
  }

  loadChannels(): void {
    if (!this.currentUserId) return;
    this.apiService.getChatChannels(this.currentUserId).subscribe({
      next: (res) => {
        this.channels = res;
      },
      error: (err) => console.error('Failed to load chat channels', err)
    });
  }

  loadUsers(): void {
    this.apiService.getChatUsers().subscribe({
      next: (res) => {
        this.users = res.map(u => {
          if (u.userId === this.currentUserId) {
            return { ...u, fullName: `${u.fullName} (You)` };
          }
          return u;
        });
      },
      error: (err) => console.error('Failed to load users for chat', err)
    });
  }

  openChannel(channel: ChatChannel): void {
    if (this.activeChannel && this.activeChannel.id !== channel.id) {
      this.signalRService.leaveChannel(this.activeChannel.id);
    }

    this.activeChannel = channel;
    this.activeView = 'chat';
    this.signalRService.joinChannel(channel.id);
    this.loadMessages(channel.id);
    this.markChannelRead(channel.id);
  }

  loadMessages(channelId: number): void {
    this.apiService.getChannelMessages(channelId).subscribe({
      next: (res) => {
        this.messages = res;
        this.scrollToBottom();
      },
      error: (err) => console.error('Failed to load channel messages', err)
    });
  }

  onInputTyping(): void {
    if (!this.activeChannel) return;
    this.signalRService.sendTyping(this.activeChannel.id, true);

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    this.typingTimer = setTimeout(() => {
      if (this.activeChannel) {
        this.signalRService.sendTyping(this.activeChannel.id, false);
      }
    }, 2000);
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.activeChannel) return;

    const content = this.messageText.trim();
    this.messageText = '';

    // Stop typing indicator
    if (this.activeChannel) {
      this.signalRService.sendTyping(this.activeChannel.id, false);
    }

    // 1. Optimistically append message to chat view instantly
    const tempMsgId = Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempMsgId,
      channelId: this.activeChannel.id,
      senderUserId: this.currentUserId,
      senderName: this.currentUserName,
      content: content,
      sentAt: new Date().toISOString(),
      isDelivered: true,
      isRead: false
    };

    this.messages.push(optimisticMsg);
    this.scrollToBottom();

    // 2. Instantly update lastMessage preview in channel list
    const channel = this.channels.find(c => c.id === this.activeChannel!.id);
    if (channel) {
      channel.lastMessage = `You: ${content}`;
      channel.lastMessageAt = optimisticMsg.sentAt;
    }

    // 3. Dispatch message over SignalR or REST fallback
    if (this.isSignalRConnected) {
      this.signalRService.sendMessage(this.activeChannel.id, content).catch(err => {
        console.warn('SignalR send error, using REST fallback', err);
        this.sendViaRestFallback(content, tempMsgId);
      });
    } else {
      this.sendViaRestFallback(content, tempMsgId);
    }
  }

  private sendViaRestFallback(content: string, tempMsgId?: number): void {
    if (!this.activeChannel) return;

    this.apiService.sendChatMessage(
      this.activeChannel.id,
      content,
      this.currentUserId,
      this.currentUserName
    ).subscribe({
      next: (realMsg) => {
        if (tempMsgId) {
          const idx = this.messages.findIndex(m => m.id === tempMsgId);
          if (idx > -1) {
            this.messages[idx] = realMsg;
          }
        }
      },
      error: (err) => console.error('Failed to send message via REST', err)
    });
  }

  private handleIncomingMessage(msg: ChatMessage): void {
    if (this.activeChannel && this.activeChannel.id === msg.channelId) {
      // Check if this matches a temporary optimistic message or real ID
      const idx = this.messages.findIndex(m =>
        m.id === msg.id ||
        (m.senderUserId === msg.senderUserId && m.content === msg.content && Math.abs(new Date(m.sentAt).getTime() - new Date(msg.sentAt).getTime()) < 10000)
      );

      if (idx > -1) {
        this.messages[idx] = msg;
      } else {
        this.messages.push(msg);
      }
      this.scrollToBottom();

      if (msg.senderUserId !== this.currentUserId && this.isOpen) {
        this.markChannelRead(msg.channelId);
      }
    } else {
      this.playNotificationSound();
    }

    const channel = this.channels.find(c => c.id === msg.channelId);
    if (channel) {
      const senderName = (msg.senderUserId === this.currentUserId)
        ? 'You'
        : (msg.senderName || 'Employee').replace(' (You)', '').trim();
      channel.lastMessage = `${senderName}: ${msg.content}`;
      channel.lastMessageAt = msg.sentAt;
      if (!this.activeChannel || this.activeChannel.id !== msg.channelId) {
        channel.unreadCount = (channel.unreadCount || 0) + 1;
      }
    } else {
      this.loadChannels();
    }
  }

  private handleUserStatusChanged(evt: UserStatusEvent): void {
    const user = this.users.find(u => u.userId === evt.userId);
    if (user) {
      user.isOnline = evt.isOnline;
    }
    this.channels.forEach(c => {
      const member = c.members.find(m => m.userId === evt.userId);
      if (member) {
        member.isOnline = evt.isOnline;
      }
    });
  }

  private handleUserTyping(evt: UserTypingEvent): void {
    if (evt.isTyping) {
      this.typingUsers[evt.channelId] = `${evt.userName} is typing...`;
    } else {
      delete this.typingUsers[evt.channelId];
    }
  }

  private handleMessagesRead(evt: MessagesReadEvent): void {
    if (this.activeChannel && this.activeChannel.id === evt.channelId) {
      this.messages.forEach(m => {
        if (m.senderUserId === this.currentUserId && evt.readMessageIds.includes(m.id)) {
          m.isRead = true;
          m.readAt = evt.readAt;
        }
      });
    }
  }

  private handleChannelUpdated(evt: ChannelUpdatedEvent): void {
    const channel = this.channels.find(c => c.id === evt.channelId);
    if (channel) {
      const isSelf = evt.lastMessage.senderUserId === this.currentUserId;
      const senderName = isSelf
        ? 'You'
        : (evt.lastMessage.senderName || 'Employee').replace(' (You)', '').trim();
      channel.lastMessage = `${senderName}: ${evt.lastMessage.content}`;
      channel.lastMessageAt = evt.lastMessage.sentAt;
    } else {
      this.loadChannels();
    }
  }

  private markChannelRead(channelId: number): void {
    this.signalRService.markMessagesAsRead(channelId);
    const channel = this.channels.find(c => c.id === channelId);
    if (channel) {
      channel.unreadCount = 0;
    }
  }

  startDirectChat(user: UserChatProfile): void {
    this.apiService.createDirectChat(this.currentUserId, user.userId).subscribe({
      next: (channel) => {
        const existingIdx = this.channels.findIndex(c => c.id === channel.id);
        if (existingIdx > -1) {
          this.channels[existingIdx] = channel;
        } else {
          this.channels.unshift(channel);
        }
        this.openChannel(channel);
      },
      error: (err) => console.error('Failed to start direct chat', err)
    });
  }

  openCreateGroup(): void {
    this.newGroupName = '';
    this.selectedUserIds = [];
    this.activeView = 'new-group';
  }

  toggleUserSelection(userId: string): void {
    const idx = this.selectedUserIds.indexOf(userId);
    if (idx > -1) {
      this.selectedUserIds.splice(idx, 1);
    } else {
      this.selectedUserIds.push(userId);
    }
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUserIds.includes(userId);
  }

  createGroup(): void {
    if (!this.newGroupName.trim() || this.selectedUserIds.length === 0) return;

    this.apiService.createGroupChat(
      this.currentUserId,
      this.newGroupName.trim(),
      this.selectedUserIds
    ).subscribe({
      next: (channel) => {
        const existingIdx = this.channels.findIndex(c => c.id === channel.id);
        if (existingIdx > -1) {
          this.channels[existingIdx] = channel;
        } else {
          this.channels.unshift(channel);
        }
        this.openChannel(channel);
      },
      error: (err) => console.error('Failed to create group chat', err)
    });
  }

  backToChannels(): void {
    if (this.activeChannel) {
      this.signalRService.leaveChannel(this.activeChannel.id);
    }
    this.activeView = 'channels';
    this.activeChannel = null;
    this.loadChannels();
  }

  get totalUnreadCount(): number {
    return this.channels.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }

  get activeTypingIndicator(): string | null {
    if (!this.activeChannel) return null;
    return this.typingUsers[this.activeChannel.id] || null;
  }

  get filteredChannels(): ChatChannel[] {
    if (!this.searchQuery.trim()) return this.channels;
    const q = this.searchQuery.toLowerCase();
    return this.channels.filter(c => (c.name || '').toLowerCase().includes(q));
  }

  get filteredUsers(): UserChatProfile[] {
    if (!this.userSearchQuery.trim()) return this.users;
    const q = this.userSearchQuery.toLowerCase();
    return this.users.filter(u =>
      u.fullName.toLowerCase().includes(q) ||
      (u.department || '').toLowerCase().includes(q) ||
      (u.designation || '').toLowerCase().includes(q)
    );
  }

  get groupUsers(): UserChatProfile[] {
    return this.users.filter(u => u.userId !== this.currentUserId);
  }

  getInitials(name?: string): string {
    if (!name) return 'CH';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  isChannelOnline(channel: ChatChannel): boolean {
    if (channel.type === 'Direct') {
      const other = channel.members.find(m => m.userId !== this.currentUserId);
      return other ? !!other.isOnline : false;
    }
    return channel.members.some(m => m.userId !== this.currentUserId && m.isOnline);
  }

  isUserAdmin(userId?: string): boolean {
    if (!userId) return false;
    const user = this.users.find(u => u.userId === userId);
    return user ? !!user.isAdmin : false;
  }

  isChannelAdmin(channel?: ChatChannel | null): boolean {
    if (!channel || channel.type !== 'Direct') return false;
    const other = channel.members.find(m => m.userId !== this.currentUserId);
    return other ? !!other.isAdmin : false;
  }

  private playNotificationSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {
      // AudioContext fallback
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }
}
