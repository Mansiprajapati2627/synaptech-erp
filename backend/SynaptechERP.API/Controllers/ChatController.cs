// Controllers/ChatController.cs
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SynaptechERP.API.Data;
using SynaptechERP.API.DTOs;
using SynaptechERP.API.Models;

namespace SynaptechERP.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public ChatController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    // GET: api/chat/users
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<UserChatProfileDto>>> GetUsers()
    {
        var dict = await GetUserProfilesDictAsync();
        return Ok(dict.Values.ToList());
    }

    // GET: api/chat/channels?userId=xyz
    [HttpGet("channels")]
    public async Task<ActionResult<IEnumerable<ChatChannelDto>>> GetUserChannels([FromQuery] string userId)
    {
        if (string.IsNullOrEmpty(userId))
        {
            return BadRequest("UserId is required.");
        }

        var conversationIds = await _context.ConversationMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => m.ConversationId)
            .ToListAsync();

        var conversations = await _context.Conversations
            .AsNoTracking()
            .Include(c => c.Members)
            .Include(c => c.Messages)
            .Where(c => conversationIds.Contains(c.Id))
            .OrderByDescending(c => c.LastMessageAt)
            .ToListAsync();

        var allUsers = await GetUserProfilesDictAsync();

        var dtos = new List<ChatChannelDto>();
        foreach (var c in conversations)
        {
            var lastMsg = c.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault();
            var memberProfiles = c.Members
                .Where(m => allUsers.ContainsKey(m.UserId))
                .Select(m =>
                {
                    var profile = allUsers[m.UserId];
                    profile.IsOnline = Hubs.ChatHub.IsUserOnline(profile.UserId);
                    return profile;
                })
                .ToList();

            string channelName = c.Name ?? string.Empty;
            if (c.Type == "Direct" && string.IsNullOrEmpty(channelName))
            {
                var otherMember = memberProfiles.FirstOrDefault(m => m.UserId != userId);
                if (otherMember != null)
                {
                    channelName = otherMember.FullName;
                }
                else
                {
                    var selfMember = memberProfiles.FirstOrDefault(m => m.UserId == userId);
                    channelName = selfMember != null ? $"{selfMember.FullName} (You)" : "Notes (You)";
                }
            }

            string lastMsgText = "No messages yet";
            if (lastMsg != null)
            {
                string senderDisplayName;
                if (lastMsg.SenderUserId == userId)
                {
                    senderDisplayName = "You";
                }
                else if (allUsers.TryGetValue(lastMsg.SenderUserId, out var senderProf) && !string.IsNullOrWhiteSpace(senderProf.FullName))
                {
                    senderDisplayName = senderProf.FullName;
                }
                else
                {
                    senderDisplayName = !string.IsNullOrWhiteSpace(lastMsg.SenderName) ? lastMsg.SenderName : "Employee";
                }

                lastMsgText = $"{senderDisplayName}: {lastMsg.Content}";
            }

            int unreadCount = c.Messages.Count(m => m.SenderUserId != userId && !m.IsRead);

            dtos.Add(new ChatChannelDto
            {
                Id = c.Id,
                Name = channelName,
                Type = c.Type,
                LastMessage = lastMsgText,
                LastMessageAt = c.LastMessageAt,
                UnreadCount = unreadCount,
                Members = memberProfiles
            });
        }

        return Ok(dtos);
    }

    // GET: api/chat/channels/{channelId}/messages
    [HttpGet("channels/{channelId}/messages")]
    public async Task<ActionResult<IEnumerable<ChatMessageDto>>> GetChannelMessages(int channelId)
    {
        var allUsers = await GetUserProfilesDictAsync();

        var messages = await _context.Messages
            .AsNoTracking()
            .Where(m => m.ConversationId == channelId && !m.IsDeleted)
            .OrderBy(m => m.SentAt)
            .Select(m => new ChatMessageDto
            {
                Id = m.Id,
                ChannelId = m.ConversationId,
                SenderUserId = m.SenderUserId,
                SenderName = m.SenderName,
                IsSenderAdmin = allUsers.ContainsKey(m.SenderUserId) && allUsers[m.SenderUserId].IsAdmin,
                Content = m.Content,
                SentAt = m.SentAt,
                IsDelivered = m.IsDelivered,
                IsRead = m.IsRead,
                ReadAt = m.ReadAt
            })
            .ToListAsync();

        return Ok(messages);
    }

    // POST: api/chat/channels/direct
    [HttpPost("channels/direct")]
    public async Task<ActionResult<ChatChannelDto>> CreateOrGetDirectChat([FromQuery] string currentUserId, [FromBody] CreateDirectChatDto dto)
    {
        if (string.IsNullOrEmpty(currentUserId) || string.IsNullOrEmpty(dto.TargetUserId))
        {
            return BadRequest("CurrentUserId and TargetUserId are required.");
        }

        int existingConversationId = 0;
        if (currentUserId == dto.TargetUserId)
        {
            existingConversationId = await _context.Conversations
                .Where(c => c.Type == "Direct" && c.Members.Count == 1 && c.Members.Any(m => m.UserId == currentUserId))
                .Select(c => c.Id)
                .FirstOrDefaultAsync();
        }
        else
        {
            var candidateConversationIds = await _context.ConversationMembers
                .Where(m => m.UserId == currentUserId || m.UserId == dto.TargetUserId)
                .GroupBy(m => m.ConversationId)
                .Where(g => g.Count() == 2)
                .Select(g => g.Key)
                .ToListAsync();

            existingConversationId = await _context.Conversations
                .Where(c => candidateConversationIds.Contains(c.Id) && c.Type == "Direct")
                .Select(c => c.Id)
                .FirstOrDefaultAsync();
        }

        if (existingConversationId > 0)
        {
            return await GetSingleChannelDto(existingConversationId, currentUserId);
        }

        // Create new direct conversation
        var newConversation = new Conversation
        {
            Type = "Direct",
            CreatedByUserId = currentUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            LastMessageAt = DateTime.UtcNow
        };

        _context.Conversations.Add(newConversation);
        await _context.SaveChangesAsync();

        _context.ConversationMembers.Add(new ConversationMember { ConversationId = newConversation.Id, UserId = currentUserId });
        if (currentUserId != dto.TargetUserId)
        {
            _context.ConversationMembers.Add(new ConversationMember { ConversationId = newConversation.Id, UserId = dto.TargetUserId });
        }
        await _context.SaveChangesAsync();

        return await GetSingleChannelDto(newConversation.Id, currentUserId);
    }

    // POST: api/chat/channels/group
    [HttpPost("channels/group")]
    public async Task<ActionResult<ChatChannelDto>> CreateGroupChat([FromQuery] string currentUserId, [FromBody] CreateGroupChatDto dto)
    {
        if (string.IsNullOrEmpty(currentUserId) || string.IsNullOrWhiteSpace(dto.GroupName))
        {
            return BadRequest("CurrentUserId and GroupName are required.");
        }

        var newConversation = new Conversation
        {
            Name = dto.GroupName.Trim(),
            Type = "Group",
            CreatedByUserId = currentUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            LastMessageAt = DateTime.UtcNow
        };

        _context.Conversations.Add(newConversation);
        await _context.SaveChangesAsync();

        var membersToAdd = dto.MemberUserIds.Distinct().ToList();
        if (!membersToAdd.Contains(currentUserId))
        {
            membersToAdd.Add(currentUserId);
        }

        foreach (var uid in membersToAdd)
        {
            _context.ConversationMembers.Add(new ConversationMember { ConversationId = newConversation.Id, UserId = uid });
        }
        await _context.SaveChangesAsync();

        return await GetSingleChannelDto(newConversation.Id, currentUserId);
    }

    // POST: api/chat/messages
    [HttpPost("messages")]
    public async Task<ActionResult<ChatMessageDto>> SendMessage([FromBody] SendChatMessageDto dto, [FromQuery] string senderUserId, [FromQuery] string senderName)
    {
        if (dto.ChannelId <= 0 || string.IsNullOrWhiteSpace(dto.Content))
        {
            return BadRequest("ChannelId and Content are required.");
        }

        var conversation = await _context.Conversations.FindAsync(dto.ChannelId);
        if (conversation == null)
        {
            return NotFound("Conversation not found.");
        }

        var message = new Message
        {
            ConversationId = dto.ChannelId,
            SenderUserId = senderUserId ?? string.Empty,
            SenderName = senderName ?? "Employee",
            Content = dto.Content.Trim(),
            SentAt = DateTime.UtcNow,
            IsDelivered = true,
            IsRead = false
        };

        _context.Messages.Add(message);
        conversation.LastMessageAt = DateTime.UtcNow;
        conversation.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var allUsers = await GetUserProfilesDictAsync();
        bool isAdmin = allUsers.ContainsKey(message.SenderUserId) && allUsers[message.SenderUserId].IsAdmin;

        var messageDto = new ChatMessageDto
        {
            Id = message.Id,
            ChannelId = message.ConversationId,
            SenderUserId = message.SenderUserId,
            SenderName = message.SenderName,
            IsSenderAdmin = isAdmin,
            Content = message.Content,
            SentAt = message.SentAt,
            IsDelivered = message.IsDelivered,
            IsRead = message.IsRead,
            ReadAt = message.ReadAt
        };

        return Ok(messageDto);
    }

    private async Task<ActionResult<ChatChannelDto>> GetSingleChannelDto(int channelId, string userId)
    {
        var c = await _context.Conversations
            .Include(ch => ch.Members)
            .Include(ch => ch.Messages)
            .FirstOrDefaultAsync(ch => ch.Id == channelId);

        if (c == null) return NotFound();

        var allUsers = await GetUserProfilesDictAsync();
        var memberProfiles = c.Members
            .Where(m => allUsers.ContainsKey(m.UserId))
            .Select(m => allUsers[m.UserId])
            .ToList();

        var lastMsg = c.Messages.Where(m => !m.IsDeleted).OrderByDescending(m => m.SentAt).FirstOrDefault();
        string channelName = c.Name ?? string.Empty;
        if (c.Type == "Direct" && string.IsNullOrEmpty(channelName))
        {
            var otherMember = memberProfiles.FirstOrDefault(m => m.UserId != userId);
            if (otherMember != null)
            {
                channelName = otherMember.FullName;
            }
            else
            {
                var selfMember = memberProfiles.FirstOrDefault(m => m.UserId == userId);
                channelName = selfMember != null ? $"{selfMember.FullName} (You)" : "Notes (You)";
            }
        }

        string lastMsgText = "No messages yet";
        if (lastMsg != null)
        {
            string senderDisplayName;
            if (lastMsg.SenderUserId == userId)
            {
                senderDisplayName = "You";
            }
            else if (allUsers.TryGetValue(lastMsg.SenderUserId, out var senderProf) && !string.IsNullOrWhiteSpace(senderProf.FullName))
            {
                senderDisplayName = senderProf.FullName;
            }
            else
            {
                senderDisplayName = !string.IsNullOrWhiteSpace(lastMsg.SenderName) ? lastMsg.SenderName : "Employee";
            }

            lastMsgText = $"{senderDisplayName}: {lastMsg.Content}";
        }

        return Ok(new ChatChannelDto
        {
            Id = c.Id,
            Name = channelName,
            Type = c.Type,
            LastMessage = lastMsgText,
            LastMessageAt = c.LastMessageAt,
            Members = memberProfiles
        });
    }

    private async Task<Dictionary<string, UserChatProfileDto>> GetUserProfilesDictAsync()
    {
        var adminEmail = _configuration["AdminSeed:Email"]?.Trim().ToLower() ?? "admin@synaptech.io";
        var adminRoleId = await _context.Roles
            .Where(r => r.Name == "Admin")
            .Select(r => r.Id)
            .FirstOrDefaultAsync();

        var adminUserIds = new HashSet<string>(
            await _context.UserRoles
                .Where(ur => ur.RoleId == adminRoleId)
                .Select(ur => ur.UserId)
                .ToListAsync()
        );

        var employees = await _context.Employees
            .AsNoTracking()
            .Include(e => e.Employment).ThenInclude(ee => ee.Department)
            .Include(e => e.Employment).ThenInclude(ee => ee.Designation)
            .Where(e => !string.IsNullOrEmpty(e.UserId))
            .ToListAsync();

        var profiles = employees
            .GroupBy(e => e.UserId!)
            .ToDictionary(
                g => g.Key,
                g =>
                {
                    var e = g.First();
                    bool isAdmin = adminUserIds.Contains(e.UserId!) || e.Email.Trim().ToLower() == adminEmail;
                    return new UserChatProfileDto
                    {
                        UserId = e.UserId!,
                        EmployeeId = e.Id,
                        FullName = $"{e.FirstName} {e.LastName}".Trim(),
                        Email = e.Email,
                        Department = e.Employment?.Department?.Name ?? "General",
                        Designation = e.Employment?.Designation?.Name ?? (isAdmin ? "System Administrator" : "Employee"),
                        Role = isAdmin ? "Admin" : "Employee",
                        IsAdmin = isAdmin,
                        IsOnline = Hubs.ChatHub.IsUserOnline(e.UserId!)
                    };
                }
            );

        var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Email != null && u.Email.ToLower() == adminEmail);
        if (adminUser != null && !profiles.ContainsKey(adminUser.Id))
        {
            profiles[adminUser.Id] = new UserChatProfileDto
            {
                UserId = adminUser.Id,
                EmployeeId = 0,
                FullName = "Administrator",
                Email = adminUser.Email ?? adminEmail,
                Department = "Management",
                Designation = "System Administrator",
                Role = "Admin",
                IsAdmin = true,
                IsOnline = Hubs.ChatHub.IsUserOnline(adminUser.Id)
            };
        }

        return profiles;
    }
}
