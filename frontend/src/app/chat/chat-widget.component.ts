import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, ChatChannel, ChatMessage, UserChatProfile } from '../services/api.service';
import { AuthService, SessionUser } from '../auth.service';
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
  isLoadingMessages = false;

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
  private pollTimer: any = null;
  isSignalRConnected = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private signalRService: SignalRService,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // 1. Subscribe to Auth user changes so state clears on logout/login/user switch
    this.subscriptions.push(
      this.authService.user$.subscribe(user => {
        this.handleUserSessionChange(user);
      })
    );

    // 2. Subscribe to SignalR events
    this.subscriptions.push(
      this.signalRService.isConnected$.subscribe(connected => {
        this.ngZone.run(() => {
          this.isSignalRConnected = connected;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
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
    this.stopPolling();
    this.subscriptions.forEach(s => s.unsubscribe());
    this.signalRService.stopConnection();
    this.updateBodyScrollLock(false);
  }

  private updateBodyScrollLock(lock?: boolean): void {
    if (typeof document !== 'undefined') {
      const shouldLock = lock !== undefined ? lock : this.isOpen;
      if (shouldLock) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  private handleUserSessionChange(user: SessionUser | undefined | null): void {
    this.ngZone.run(() => {
      const newUserId = user?.id || '';
      const newUserName = user?.name || user?.employeeName || user?.email || 'Employee';
      const newToken = this.authService.getToken() || '';

      if (!user || !newUserId) {
        this.signalRService.stopConnection();
        this.currentUserId = '';
        this.currentUserName = '';
        this.token = '';
        this.channels = [];
        this.users = [];
        this.messages = [];
        this.activeChannel = null;
        this.activeView = 'channels';
        this.isOpen = false;
        this.updateBodyScrollLock(false);
        this.stopPolling();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        return;
      }

      if (newUserId !== this.currentUserId || newToken !== this.token) {
        this.currentUserId = newUserId;
        this.currentUserName = newUserName;
        this.token = newToken;

        // Reset local state completely for the new user session
        this.channels = [];
        this.users = [];
        this.messages = [];
        this.activeChannel = null;
        this.activeView = 'channels';

        this.signalRService.stopConnection();
        this.signalRService.startConnection(this.token, this.currentUserId);

        this.loadChannels();
        this.loadUsers();
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  toggleChat(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isOpen = !this.isOpen;
    this.updateBodyScrollLock();
    if (this.isOpen) {
      this.loadChannels();
      this.loadUsers();
      if (this.activeChannel) {
        this.loadMessages(this.activeChannel.id);
        this.markChannelRead(this.activeChannel.id);
      }
      this.startPolling();
    } else {
      this.stopPolling();
    }
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) return;
    const path = event.composedPath ? event.composedPath() : [];
    if (path.length > 0) {
      if (path.includes(this.elementRef.nativeElement)) {
        return; // Click originated inside chat widget
      }
    } else {
      const target = event.target as HTMLElement;
      if (target && (this.elementRef.nativeElement.contains(target) || !document.body.contains(target))) {
        return; // Clicked inside or target was detached during click handler execution
      }
    }
    this.closeChat();
  }

  closeChat(): void {
    this.isOpen = false;
    this.updateBodyScrollLock(false);
    this.stopPolling();
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      this.ngZone.run(() => {
        if (this.isOpen && this.currentUserId) {
          this.loadChannels(true);
          if (this.activeView === 'chat' && this.activeChannel) {
            this.loadMessages(this.activeChannel.id, true);
          }
        }
      });
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  loadChannels(silent = false): void {
    if (!this.currentUserId) return;
    this.apiService.getChatChannels(this.currentUserId).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.channels = res;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        if (!silent) console.error('Failed to load chat channels', err);
      }
    });
  }

  loadUsers(): void {
    this.apiService.getChatUsers().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.users = res.map(u => {
            if (this.isSameUser(u.userId, this.currentUserId)) {
              return { ...u, fullName: `${u.fullName} (You)` };
            }
            return u;
          });
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('Failed to load users for chat', err)
    });
  }

  openChannel(channel: ChatChannel): void {
    if (this.activeChannel && !this.isSameChannel(this.activeChannel.id, channel.id)) {
      this.signalRService.leaveChannel(Number(this.activeChannel.id));
    }

    // Immediately clear old messages to prevent showing another user's/channel's old chat!
    this.messages = [];
    this.isLoadingMessages = true;
    this.activeChannel = channel;
    this.activeView = 'chat';

    this.cdr.markForCheck();
    this.cdr.detectChanges();

    this.signalRService.joinChannel(Number(channel.id));
    this.loadMessages(channel.id);
    this.markChannelRead(channel.id);
  }

  loadMessages(channelId: number | string, silent = false): void {
    this.apiService.getChannelMessages(Number(channelId)).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          // Use isSameChannel helper to safely compare channelId regardless of string vs number
          if (!this.activeChannel || !this.isSameChannel(this.activeChannel.id, channelId)) {
            return;
          }

          if (silent) {
            const isDifferentLength = res.length !== this.messages.length;
            const isDifferentLastMsg = res.length > 0 && this.messages.length > 0 && !this.isSameChannel(res[res.length - 1].id, this.messages[this.messages.length - 1]?.id);

            if (isDifferentLength || isDifferentLastMsg) {
              const wasAtBottom = this.isScrolledNearBottom();
              this.messages = res;
              if (wasAtBottom) {
                this.scrollToBottom();
              }
            }
          } else {
            this.messages = res;
            this.scrollToBottom();
          }
          this.isLoadingMessages = false;
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          if (!silent) {
            console.error('Failed to load channel messages', err);
          }
          if (this.activeChannel && this.isSameChannel(this.activeChannel.id, channelId)) {
            this.isLoadingMessages = false;
          }
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  private isScrolledNearBottom(): boolean {
    if (!this.scrollContainer) return true;
    const el = this.scrollContainer.nativeElement;
    const threshold = 150;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }

  onInputTyping(): void {
    if (!this.activeChannel) return;
    this.signalRService.sendTyping(Number(this.activeChannel.id), true);

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }
    this.typingTimer = setTimeout(() => {
      if (this.activeChannel) {
        this.signalRService.sendTyping(Number(this.activeChannel.id), false);
      }
    }, 2000);
  }

  sendMessage(): void {
    if (!this.messageText.trim() || !this.activeChannel) return;

    const content = this.messageText.trim();
    this.messageText = '';

    // Stop typing indicator
    if (this.activeChannel) {
      this.signalRService.sendTyping(Number(this.activeChannel.id), false);
    }

    // 1. Optimistically append message to chat view instantly
    const tempMsgId = Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempMsgId,
      channelId: Number(this.activeChannel.id),
      senderUserId: this.currentUserId,
      senderName: this.currentUserName,
      content: content,
      sentAt: new Date().toISOString(),
      isDelivered: true,
      isRead: false
    };

    this.messages.push(optimisticMsg);
    this.scrollToBottom();
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    // 2. Instantly update lastMessage preview in channel list
    const channel = this.channels.find(c => this.isSameChannel(c.id, this.activeChannel!.id));
    if (channel) {
      channel.lastMessage = `You: ${content}`;
      channel.lastMessageAt = optimisticMsg.sentAt;
    }

    // 3. Dispatch message over SignalR or REST fallback
    if (this.isSignalRConnected) {
      this.signalRService.sendMessage(Number(this.activeChannel.id), content).catch(err => {
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
      Number(this.activeChannel.id),
      content,
      this.currentUserId,
      this.currentUserName
    ).subscribe({
      next: (realMsg) => {
        this.ngZone.run(() => {
          if (tempMsgId) {
            const idx = this.messages.findIndex(m => m.id === tempMsgId);
            if (idx > -1) {
              this.messages[idx] = realMsg;
            }
          }
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      },
      error: (err) => console.error('Failed to send message via REST', err)
    });
  }

  public isSameChannel(id1: any, id2: any): boolean {
    if (id1 == null || id2 == null) return false;
    return String(id1).trim() === String(id2).trim();
  }

  public isSameUser(id1: any, id2: any): boolean {
    if (id1 == null || id2 == null) return false;
    return String(id1).trim().toLowerCase() === String(id2).trim().toLowerCase();
  }

  private handleIncomingMessage(msg: ChatMessage): void {
    this.ngZone.run(() => {
      if (!msg || !msg.channelId) return;

      const isFromOtherUser = !this.isSameUser(msg.senderUserId, this.currentUserId);
      const isActive = this.activeChannel && this.isSameChannel(this.activeChannel.id, msg.channelId);

      if (isActive) {
        const idx = this.messages.findIndex(m =>
          this.isSameChannel(m.id, msg.id) ||
          (this.isSameUser(m.senderUserId, msg.senderUserId) && m.content === msg.content && Math.abs(new Date(m.sentAt).getTime() - new Date(msg.sentAt).getTime()) < 10000)
        );

        if (idx > -1) {
          this.messages[idx] = msg;
          this.messages = [...this.messages];
        } else {
          this.messages = [...this.messages, msg];
        }
        this.scrollToBottom();

        if (isFromOtherUser) {
          if (this.isOpen) {
            this.markChannelRead(msg.channelId);
          }
          this.playNotificationSound();
        }
      } else {
        if (isFromOtherUser) {
          this.playNotificationSound();
        }
      }

      const channel = this.channels.find(c => this.isSameChannel(c.id, msg.channelId));
      if (channel) {
        const isSelf = this.isSameUser(msg.senderUserId, this.currentUserId);
        const senderName = isSelf
          ? 'You'
          : (msg.senderName || 'Employee').replace(' (You)', '').trim();
        channel.lastMessage = `${senderName}: ${msg.content}`;
        channel.lastMessageAt = msg.sentAt;
        if (!isActive && isFromOtherUser) {
          channel.unreadCount = (channel.unreadCount || 0) + 1;
        }
      } else {
        this.loadChannels();
      }
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  private handleUserStatusChanged(evt: UserStatusEvent): void {
    this.ngZone.run(() => {
      const user = this.users.find(u => this.isSameUser(u.userId, evt.userId));
      if (user) {
        user.isOnline = evt.isOnline;
      }
      this.channels.forEach(c => {
        const member = c.members.find(m => this.isSameUser(m.userId, evt.userId));
        if (member) {
          member.isOnline = evt.isOnline;
        }
      });
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  private handleUserTyping(evt: UserTypingEvent): void {
    this.ngZone.run(() => {
      if (evt.isTyping) {
        this.typingUsers[evt.channelId] = `${evt.userName} is typing...`;
      } else {
        delete this.typingUsers[evt.channelId];
      }
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  private handleMessagesRead(evt: MessagesReadEvent): void {
    this.ngZone.run(() => {
      if (this.activeChannel && this.isSameChannel(this.activeChannel.id, evt.channelId)) {
        let updated = false;
        this.messages.forEach(m => {
          if (this.isSameUser(m.senderUserId, this.currentUserId) && evt.readMessageIds.includes(m.id)) {
            m.isRead = true;
            m.readAt = evt.readAt;
            updated = true;
          }
        });
        if (updated) {
          this.messages = [...this.messages];
        }
      }
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  private handleChannelUpdated(evt: ChannelUpdatedEvent): void {
    this.ngZone.run(() => {
      if (!evt || !evt.channelId) return;

      const msg = evt.lastMessage;
      const isActive = this.activeChannel && this.isSameChannel(this.activeChannel.id, evt.channelId);

      if (isActive && msg) {
        this.handleIncomingMessage(msg);
        return;
      }

      if (msg) {
        const isFromOtherUser = !this.isSameUser(msg.senderUserId, this.currentUserId);
        const channel = this.channels.find(c => this.isSameChannel(c.id, evt.channelId));
        if (channel) {
          const isSelf = this.isSameUser(msg.senderUserId, this.currentUserId);
          const senderName = isSelf
            ? 'You'
            : (msg.senderName || 'Employee').replace(' (You)', '').trim();
          channel.lastMessage = `${senderName}: ${msg.content}`;
          channel.lastMessageAt = msg.sentAt;
          if (isFromOtherUser) {
            channel.unreadCount = (channel.unreadCount || 0) + 1;
            this.playNotificationSound();
          }
        } else {
          this.loadChannels();
        }
      } else {
        this.loadChannels();
      }
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    });
  }

  private markChannelRead(channelId: number | string): void {
    this.signalRService.markMessagesAsRead(Number(channelId));
    const channel = this.channels.find(c => this.isSameChannel(c.id, channelId));
    if (channel) {
      channel.unreadCount = 0;
    }
  }

  startDirectChat(user: UserChatProfile): void {
    this.messages = [];
    this.isLoadingMessages = true;
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    this.apiService.createDirectChat(this.currentUserId, user.userId).subscribe({
      next: (channel) => {
        this.ngZone.run(() => {
          const existingIdx = this.channels.findIndex(c => this.isSameChannel(c.id, channel.id));
          if (existingIdx > -1) {
            this.channels[existingIdx] = channel;
          } else {
            this.channels.unshift(channel);
          }
          this.openChannel(channel);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isLoadingMessages = false;
          console.error('Failed to start direct chat', err);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  openCreateGroup(): void {
    this.newGroupName = '';
    this.selectedUserIds = [];
    this.activeView = 'new-group';
    this.cdr.markForCheck();
    this.cdr.detectChanges();
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

    this.messages = [];
    this.isLoadingMessages = true;
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    this.apiService.createGroupChat(
      this.currentUserId,
      this.newGroupName.trim(),
      this.selectedUserIds
    ).subscribe({
      next: (channel) => {
        this.ngZone.run(() => {
          const existingIdx = this.channels.findIndex(c => this.isSameChannel(c.id, channel.id));
          if (existingIdx > -1) {
            this.channels[existingIdx] = channel;
          } else {
            this.channels.unshift(channel);
          }
          this.openChannel(channel);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.isLoadingMessages = false;
          console.error('Failed to create group chat', err);
          this.cdr.markForCheck();
          this.cdr.detectChanges();
        });
      }
    });
  }

  backToChannels(): void {
    if (this.activeChannel) {
      this.signalRService.leaveChannel(Number(this.activeChannel.id));
    }
    this.activeView = 'channels';
    this.activeChannel = null;
    this.messages = [];
    this.loadChannels();
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }

  get totalUnreadCount(): number {
    return this.channels.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }

  get activeTypingIndicator(): string | null {
    if (!this.activeChannel) return null;
    return this.typingUsers[Number(this.activeChannel.id)] || null;
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
    return this.users.filter(u => !this.isSameUser(u.userId, this.currentUserId));
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
      const other = channel.members.find(m => !this.isSameUser(m.userId, this.currentUserId));
      return other ? !!other.isOnline : false;
    }
    return channel.members.some(m => !this.isSameUser(m.userId, this.currentUserId) && m.isOnline);
  }

  isUserAdmin(userId?: string): boolean {
    if (!userId) return false;
    const user = this.users.find(u => this.isSameUser(u.userId, userId));
    return user ? !!user.isAdmin : false;
  }

  isChannelAdmin(channel?: ChatChannel | null): boolean {
    if (!channel || channel.type !== 'Direct') return false;
    const other = channel.members.find(m => !this.isSameUser(m.userId, this.currentUserId));
    return other ? !!other.isAdmin : false;
  }

  private playNotificationSound(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;

      // Note 1: Soft high pitch (E5 - 659.25Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Note 2: Harmonic pleasant chime (B5 - 987.77Hz)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.08);
      gain2.gain.setValueAtTime(0.1, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
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
