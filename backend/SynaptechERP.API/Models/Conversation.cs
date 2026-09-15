// Models/Conversation.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.Models;

public class Conversation
{
    public int Id { get; set; }

    [MaxLength(100)]
    public string? Name { get; set; } // Group name (null for Direct chats)

    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = "Direct"; // "Direct" or "Group"

    public string? CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

    public ICollection<ConversationMember> Members { get; set; } = new List<ConversationMember>();

    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
