// DTOs/ChatDtos.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.DTOs;

public class ChatChannelDto
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string Type { get; set; } = "Direct";
    public string? LastMessage { get; set; }
    public DateTime? LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
    public List<UserChatProfileDto> Members { get; set; } = new();
}

public class ChatMessageDto
{
    public int Id { get; set; }
    public int ChannelId { get; set; }
    public string SenderUserId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public bool IsSenderAdmin { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public bool IsDelivered { get; set; } = true;
    public bool IsRead { get; set; } = false;
    public DateTime? ReadAt { get; set; }
}

public class UserChatProfileDto
{
    public string UserId { get; set; } = string.Empty;
    public int EmployeeId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? Designation { get; set; }
    public string? Role { get; set; }
    public bool IsAdmin { get; set; }
    public bool IsOnline { get; set; }
}

public class CreateDirectChatDto
{
    [Required]
    public string TargetUserId { get; set; } = string.Empty;
}

public class CreateGroupChatDto
{
    [Required]
    [MaxLength(100)]
    public string GroupName { get; set; } = string.Empty;

    [Required]
    public List<string> MemberUserIds { get; set; } = new();
}

public class SendChatMessageDto
{
    [Required]
    public int ChannelId { get; set; }

    [Required]
    public string Content { get; set; } = string.Empty;
}
