// Hubs/ChatHub.cs
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Hubs;

public class CustomUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? connection.User?.FindFirst("sub")?.Value
            ?? connection.GetHttpContext()?.Request.Query["userId"].ToString();
    }
}

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _context;

    // Track online user connections: UserId -> HashSet of ConnectionIds
    public static readonly ConcurrentDictionary<string, HashSet<string>> OnlineUsers = new();

    public ChatHub(AppDbContext context)
    {
        _context = context;
    }

    public static bool IsUserOnline(string userId)
    {
        return OnlineUsers.TryGetValue(userId, out var connections) && connections.Count > 0;
    }

    public static List<string> GetOnlineUserIds()
    {
        return OnlineUsers.Where(kvp => kvp.Value.Count > 0).Select(kvp => kvp.Key).ToList();
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            bool wasOnline = IsUserOnline(userId);
            OnlineUsers.AddOrUpdate(userId,
                _ => new HashSet<string> { Context.ConnectionId },
                (_, set) => { lock (set) { set.Add(Context.ConnectionId); } return set; });

            if (!wasOnline)
            {
                await Clients.Others.SendAsync("UserStatusChanged", userId, true);
            }
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (!string.IsNullOrEmpty(userId))
        {
            if (OnlineUsers.TryGetValue(userId, out var set))
            {
                lock (set)
                {
                    set.Remove(Context.ConnectionId);
                }
                if (set.Count == 0)
                {
                    OnlineUsers.TryRemove(userId, out _);
                    await Clients.Others.SendAsync("UserStatusChanged", userId, false);
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinChannel(int channelId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"channel-{channelId}");
    }

    public async Task LeaveChannel(int channelId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"channel-{channelId}");
    }

    public async Task SendTyping(int channelId, bool isTyping)
    {
        var userId = GetUserId();
        var userName = GetUserName();
        if (string.IsNullOrEmpty(userId)) return;

        await Clients.OthersInGroup($"channel-{channelId}").SendAsync("UserTyping", channelId, userId, userName, isTyping);
    }

    public async Task SendMessage(int channelId, string content)
    {
        var userId = GetUserId();
        var userName = GetUserName();
        if (string.IsNullOrEmpty(userId) || string.IsNullOrWhiteSpace(content)) return;

        var conversation = await _context.Conversations
            .Include(c => c.Members)
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (conversation == null) return;

        var isMember = conversation.Members.Any(m => m.UserId == userId);
        if (!isMember) return;

        bool isAdmin = (Context.User?.IsInRole("Admin") == true) ||
                       (userName != null && userName.Contains("Admin", StringComparison.OrdinalIgnoreCase));

        var dto = new ChatMessageDto
        {
            Id = (int)(DateTime.UtcNow.Ticks % 2147483647),
            ChannelId = channelId,
            SenderUserId = userId,
            SenderName = userName,
            IsSenderAdmin = isAdmin,
            Content = content.Trim(),
            SentAt = DateTime.UtcNow,
            IsDelivered = true,
            IsRead = false
        };

        // 1. INSTANT BROADCAST over WebSocket to recipient clients (0ms delay)
        _ = Task.Run(async () =>
        {
            try
            {
                await Clients.Group($"channel-{channelId}").SendAsync("ReceiveMessage", dto);
                foreach (var member in conversation.Members)
                {
                    await Clients.User(member.UserId).SendAsync("ReceiveMessage", dto);
                    await Clients.User(member.UserId).SendAsync("ChannelUpdated", channelId, dto);

                    if (OnlineUsers.TryGetValue(member.UserId, out var connections))
                    {
                        foreach (var connId in connections)
                        {
                            await Clients.Client(connId).SendAsync("ReceiveMessage", dto);
                            await Clients.Client(connId).SendAsync("ChannelUpdated", channelId, dto);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SignalR Instant Broadcast Error] {ex.Message}");
            }
        });

        // 2. Persist message to database
        var msg = new Message
        {
            ConversationId = channelId,
            SenderUserId = userId,
            SenderName = userName,
            Content = content.Trim(),
            SentAt = dto.SentAt,
            IsDelivered = true,
            IsRead = false
        };

        _context.Messages.Add(msg);
        conversation.LastMessageAt = DateTime.UtcNow;
        conversation.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task MarkMessagesAsRead(int channelId)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return;

        var unreadMessages = await _context.Messages
            .Where(m => m.ConversationId == channelId && m.SenderUserId != userId && !m.IsRead)
            .ToListAsync();

        if (unreadMessages.Any())
        {
            var now = DateTime.UtcNow;
            foreach (var m in unreadMessages)
            {
                m.IsRead = true;
                m.ReadAt = now;
            }
            await _context.SaveChangesAsync();

            var readMsgIds = unreadMessages.Select(m => m.Id).ToList();
            await Clients.Group($"channel-{channelId}").SendAsync("MessagesRead", channelId, userId, readMsgIds, now);
        }
    }

    private string GetUserId()
    {
        return Context.UserIdentifier
            ?? Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? Context.GetHttpContext()?.Request.Query["userId"].ToString()
            ?? string.Empty;
    }

    private string GetUserName()
    {
        return Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
            ?? Context.User?.FindFirst("name")?.Value
            ?? "Employee";
    }
}
