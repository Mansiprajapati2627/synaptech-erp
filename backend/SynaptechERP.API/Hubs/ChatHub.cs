// Hubs/ChatHub.cs
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Hubs;

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

        var msg = new Message
        {
            ConversationId = channelId,
            SenderUserId = userId,
            SenderName = userName,
            Content = content.Trim(),
            SentAt = DateTime.UtcNow,
            IsDelivered = true,
            IsRead = false
        };

        _context.Messages.Add(msg);
        conversation.LastMessageAt = DateTime.UtcNow;
        conversation.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        bool isAdmin = (Context.User?.IsInRole("Admin") == true) ||
                       (userName != null && userName.Contains("Admin", StringComparison.OrdinalIgnoreCase));

        var dto = new ChatMessageDto
        {
            Id = msg.Id,
            ChannelId = msg.ConversationId,
            SenderUserId = msg.SenderUserId,
            SenderName = msg.SenderName,
            IsSenderAdmin = isAdmin,
            Content = msg.Content,
            SentAt = msg.SentAt,
            IsDelivered = msg.IsDelivered,
            IsRead = msg.IsRead,
            ReadAt = msg.ReadAt
        };

        // Broadcast to channel group and send confirmation directly to caller
        await Clients.Group($"channel-{channelId}").SendAsync("ReceiveMessage", dto);
        await Clients.Caller.SendAsync("ReceiveMessage", dto);

        // Notify member clients individually so their channel list updates in real-time
        foreach (var member in conversation.Members)
        {
            if (OnlineUsers.TryGetValue(member.UserId, out var connections))
            {
                foreach (var connId in connections)
                {
                    await Clients.Client(connId).SendAsync("ChannelUpdated", channelId, dto);
                }
            }
        }
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
