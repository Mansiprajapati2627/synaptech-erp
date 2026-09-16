import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { ChatMessage } from './api.service';

export interface UserStatusEvent {
  userId: string;
  isOnline: boolean;
}

export interface UserTypingEvent {
  channelId: number;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface MessagesReadEvent {
  channelId: number;
  userId: string;
  readMessageIds: number[];
  readAt: string;
}

export interface ChannelUpdatedEvent {
  channelId: number;
  lastMessage: ChatMessage;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;

  public isConnected$ = new BehaviorSubject<boolean>(false);
  public userStatusChanged$ = new Subject<UserStatusEvent>();
  public userTyping$ = new Subject<UserTypingEvent>();
  public receiveMessage$ = new Subject<ChatMessage>();
  public channelUpdated$ = new Subject<ChannelUpdatedEvent>();
  public messagesRead$ = new Subject<MessagesReadEvent>();

  private hubUrl = 'http://localhost:5245/hubs/chat';

  constructor(private ngZone: NgZone) {}

  public startConnection(token?: string, userId?: string): void {
    if (!userId) {
      this.stopConnection();
      return;
    }

    if (this.hubConnection) {
      try {
        this.hubConnection.stop();
      } catch {}
      this.hubConnection = null;
    }

    const builder = new signalR.HubConnectionBuilder()
      .withUrl(`${this.hubUrl}?userId=${encodeURIComponent(userId || '')}`, {
        accessTokenFactory: () => token || '',
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information);

    this.hubConnection = builder.build();

    this.registerHandlers();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR WebSocket connected successfully');
        this.ngZone.run(() => this.isConnected$.next(true));
      })
      .catch((err) => {
        console.error('SignalR WebSocket Connection Error:', err);
        this.ngZone.run(() => this.isConnected$.next(false));
      });

    this.hubConnection.onreconnecting(() => {
      this.ngZone.run(() => this.isConnected$.next(false));
    });

    this.hubConnection.onreconnected(() => {
      this.ngZone.run(() => this.isConnected$.next(true));
    });

    this.hubConnection.onclose(() => {
      this.ngZone.run(() => this.isConnected$.next(false));
    });
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      try {
        this.hubConnection.stop();
      } catch {}
      this.hubConnection = null;
      this.ngZone.run(() => this.isConnected$.next(false));
    }
  }

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('UserStatusChanged', (userId: string, isOnline: boolean) => {
      this.ngZone.run(() => {
        this.userStatusChanged$.next({ userId, isOnline });
      });
    });

    this.hubConnection.on('UserTyping', (channelId: number, userId: string, userName: string, isTyping: boolean) => {
      this.ngZone.run(() => {
        this.userTyping$.next({ channelId, userId, userName, isTyping });
      });
    });

    this.hubConnection.on('ReceiveMessage', (message: ChatMessage) => {
      this.ngZone.run(() => {
        this.receiveMessage$.next(message);
      });
    });

    this.hubConnection.on('ChannelUpdated', (channelId: number, lastMessage: ChatMessage) => {
      this.ngZone.run(() => {
        this.channelUpdated$.next({ channelId, lastMessage });
      });
    });

    this.hubConnection.on('MessagesRead', (channelId: number, userId: string, readMessageIds: number[], readAt: string) => {
      this.ngZone.run(() => {
        this.messagesRead$.next({ channelId, userId, readMessageIds, readAt });
      });
    });
  }

  public joinChannel(channelId: number): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinChannel', channelId).catch(err => console.error(err));
    }
  }

  public leaveChannel(channelId: number): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('LeaveChannel', channelId).catch(err => console.error(err));
    }
  }

  public sendTyping(channelId: number, isTyping: boolean): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('SendTyping', channelId, isTyping).catch(err => console.error(err));
    }
  }

  public sendMessage(channelId: number, content: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.invoke('SendMessage', channelId, content);
    }
    return Promise.reject('SignalR not connected');
  }

  public markMessagesAsRead(channelId: number): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('MarkMessagesAsRead', channelId).catch(err => console.error(err));
    }
  }
}
