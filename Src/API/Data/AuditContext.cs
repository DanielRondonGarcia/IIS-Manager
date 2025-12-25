using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace IisManagerApi.Data
{
    public class AuditLog
    {
        [Key]
        public int Id { get; set; }
        public DateTime Timestamp { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Target { get; set; } = string.Empty; // Site Name or App Pool Name
        public string? Details { get; set; }
        public string? ClientIp { get; set; }
    }

    public class AuditContext : DbContext
    {
        public AuditContext(DbContextOptions<AuditContext> options) : base(options) { }
        public DbSet<AuditLog> AuditLogs { get; set; }
    }
}
