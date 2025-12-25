
export interface Application {
  path: string;
  poolName: string;
}

export interface IisSite {
  id: number;
  name: string;
  state: 'Started' | 'Stopped' | 'Unknown' | string;
  applications: Application[];
}

export interface AppPool {
  name: string;
  state: 'Started' | 'Stopped' | 'Unknown' | string;
  managedRuntimeVersion: string;
  pipelineMode: string;
  identity: string;
  applicationCount: number;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  action: string;
  target: string;
  details: string;
  clientIp: string;
}

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}
