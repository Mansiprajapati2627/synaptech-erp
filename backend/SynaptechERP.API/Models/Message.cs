// Models/Message.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.Models;

public class Message
{
    public int Id { get; set; }

    public int ConversationId { get; set; }

    [Required]
    public string SenderUserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string SenderName { get; set; } = string.Empty;

    [Required]
    public string Content { get; set; } = string.Empty;

    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public DateTime? EditedAt { get; set; }

    public DateTime? DeletedAt { get; set; }

    public bool IsDeleted { get; set; } = false;

    public bool IsDelivered { get; set; } = true;

    public bool IsRead { get; set; } = false;

    public DateTime? ReadAt { get; set; }

    public Conversation? Conversation { get; set; }
}
