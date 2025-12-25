using Microsoft.Web.Administration;

namespace IisManagerApi;

public class IisService
{
    public object GetTopology(string? filter)
    {
        // Note: ServerManager requires administrative privileges/IIS to be installed.
        // In a development environment without IIS, this might fail or return empty if IIS Express is not targeted.
        // Assuming deployment on a server with IIS.
        
        using var serverManager = new ServerManager();
        
        var sites = serverManager.Sites.AsEnumerable();

        if (!string.IsNullOrEmpty(filter))
        {
            var f = filter.ToLowerInvariant();
            sites = sites.Where(s => 
                s.Name.ToLowerInvariant().Contains(f) || 
                s.Applications.Any(a => a.Path.ToLowerInvariant().Contains(f))
            );
        }

        var result = sites.Select(site => new 
        {
            Name = site.Name,
            Id = site.Id,
            State = site.State.ToString(),
            Applications = site.Applications.Select(app => new 
            {
                Path = app.Path,
                PoolName = app.ApplicationPoolName
            }).ToList()
        }).ToList();

        return result;
    }

    public object GetApplicationPools(string? filter)
    {
        using var serverManager = new ServerManager();
        var pools = serverManager.ApplicationPools.AsEnumerable();

        if (!string.IsNullOrEmpty(filter))
        {
            var f = filter.ToLowerInvariant();
            pools = pools.Where(p => p.Name.ToLowerInvariant().Contains(f));
        }

        // Pre-calculate application counts per pool to avoid N+1 iterations
        var appCounts = serverManager.Sites
            .SelectMany(s => s.Applications)
            .GroupBy(a => a.ApplicationPoolName)
            .ToDictionary(g => g.Key, g => g.Count(), StringComparer.OrdinalIgnoreCase);

        var result = pools.Select(pool => 
        {
            // Determine Identity: If SpecificUser, use UserName, otherwise use IdentityType string
            string identity = pool.ProcessModel.IdentityType == ProcessModelIdentityType.SpecificUser 
                ? pool.ProcessModel.UserName 
                : pool.ProcessModel.IdentityType.ToString();

            return new
            {
                Name = pool.Name,
                State = pool.State.ToString(),
                ManagedRuntimeVersion = pool.ManagedRuntimeVersion,
                PipelineMode = pool.ManagedPipelineMode.ToString(),
                Identity = identity,
                ApplicationCount = appCounts.TryGetValue(pool.Name, out var count) ? count : 0
            };
        }).ToList();

        return result;
    }

    public void RestartSite(string siteName)
    {
        using var serverManager = new ServerManager();
        var site = serverManager.Sites.FirstOrDefault(s => s.Name.Equals(siteName, StringComparison.OrdinalIgnoreCase));
        
        if (site == null) 
            throw new KeyNotFoundException($"Site '{siteName}' not found.");

        // Stop if not stopped, then start
        if (site.State != ObjectState.Stopped)
        {
            site.Stop();
        }
        
        // Wait briefly or just start? 
        // Direct Stop/Start is usually fine, but checking state is safer.
        // However, site.Stop() is async-ish in that it requests stop.
        // Let's just try the standard way.
        
        if (site.State == ObjectState.Stopped)
        {
            site.Start();
        }
        else
        {
            // If it was running, we stopped it. Now start it.
            // There might be a timing issue if we call Start immediately after Stop returns
            // but MWA usually handles the request.
            site.Start();
        }
    }

    public void RecycleAppPool(string poolName)
    {
        using var serverManager = new ServerManager();
        var pool = serverManager.ApplicationPools.FirstOrDefault(p => p.Name.Equals(poolName, StringComparison.OrdinalIgnoreCase));
        
        if (pool == null) 
            throw new KeyNotFoundException($"Application Pool '{poolName}' not found.");

        pool.Recycle();
    }
}
