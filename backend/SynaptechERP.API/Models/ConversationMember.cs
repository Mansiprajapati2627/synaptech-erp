// Models/ConversationMember.cs
using System.ComponentModel.DataAnnotations;

namespace SynaptechERP.API.Models;

public class ConversationMember
{
    public int Id { get; set; }

    public int ConversationId { get; set; }

    [Required]
    public string UserId { get; set; } = string.Empty;

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastReadAt { get; set; }

    public Conversation? Conversation { get; set; }
}
