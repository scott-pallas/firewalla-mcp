import {
  SecureUtil,
  FWGroupApi,
  FWGroup,
  FWMessage,
  FWGetMessage,
  AlarmService,
  HostService,
  NetworkService,
  InitService,
} from "node-firewalla";

export interface FlowFilter {
  domain?: string;
  ip?: string;
  port?: number;
  protocol?: string;
  category?: string;
  app?: string;
}

export interface FlowQueryOptions {
  mac?: string;
  count?: number;
  ts?: number;
  ets?: number;
  asc?: boolean;
  include?: FlowFilter[];
  exclude?: FlowFilter[];
}

export class FirewallaClient {
  private fwGroup: FWGroup | null = null;
  private alarmService: AlarmService | null = null;
  private hostService: HostService | null = null;
  private networkService: NetworkService | null = null;
  private initService: InitService | null = null;

  constructor(
    private ip: string,
    private publicKeyPath: string,
    private privateKeyPath: string,
  ) {}

  async connect(): Promise<void> {
    SecureUtil.importKeyPair(this.publicKeyPath, this.privateKeyPath);
    const { groups } = await FWGroupApi.login();
    if (!groups || groups.length === 0) {
      throw new Error("No Firewalla groups found. Check your keypair and pairing.");
    }
    this.fwGroup = FWGroup.fromJson(groups[0], this.ip);
    this.alarmService = new AlarmService(this.fwGroup);
    this.hostService = new HostService(this.fwGroup);
    this.networkService = new NetworkService(this.fwGroup);
    this.initService = new InitService(this.fwGroup);
  }

  private ensureConnected() {
    if (!this.fwGroup) {
      throw new Error("Not connected to Firewalla. Call connect() first.");
    }
  }

  async getAlarms() {
    this.ensureConnected();
    return this.alarmService!.getAll();
  }

  async getDevices() {
    this.ensureConnected();
    const result = await this.hostService!.getAll();
    return (result as any)?.hosts ?? result;
  }

  async ping() {
    this.ensureConnected();
    return this.networkService!.ping();
  }

  async getMonthlyDataUsage() {
    this.ensureConnected();
    return this.networkService!.getMonthlyDataUsage();
  }

  async getSpeedtestResults() {
    this.ensureConnected();
    return this.networkService!.getSpeedtestResults();
  }

  async getNetworkMonitorData() {
    this.ensureConnected();
    return this.networkService!.getNetworkMonitorData();
  }

  async getInit(): Promise<any> {
    this.ensureConnected();
    return this.initService!.init();
  }

  async searchFlows(options: FlowQueryOptions = {}): Promise<any> {
    this.ensureConnected();
    const target = options.mac || "0.0.0.0";
    const data: Record<string, any> = {
      item: "flows",
      apiVer: 3,
      count: options.count ?? 100,
      regular: true,
      dns: false,
      audit: false,
    };
    if (options.ts) data.ts = options.ts;
    if (options.ets) data.ets = options.ets;
    if (options.asc !== undefined) data.asc = options.asc;
    if (options.include?.length) data.include = options.include;
    if (options.exclude?.length) data.exclude = options.exclude;

    const msg = new FWMessage("get", data, target);
    return FWGroupApi.sendMessageToBox(this.fwGroup!, msg);
  }

  async getDnsQueries(options: FlowQueryOptions = {}): Promise<any> {
    this.ensureConnected();
    const target = options.mac || "0.0.0.0";
    const data: Record<string, any> = {
      item: "flows",
      apiVer: 3,
      count: options.count ?? 100,
      regular: false,
      dns: true,
      audit: false,
    };
    if (options.ts) data.ts = options.ts;
    if (options.ets) data.ets = options.ets;
    if (options.asc !== undefined) data.asc = options.asc;
    if (options.include?.length) data.include = options.include;
    if (options.exclude?.length) data.exclude = options.exclude;

    const msg = new FWMessage("get", data, target);
    return FWGroupApi.sendMessageToBox(this.fwGroup!, msg);
  }

  async getRules(): Promise<any> {
    this.ensureConnected();
    const msg = new FWGetMessage("policies");
    return FWGroupApi.sendMessageToBox(this.fwGroup!, msg);
  }

  async getFeatures(): Promise<any> {
    this.ensureConnected();
    const init: any = await this.initService!.init();

    const globalPolicy = init.policy ?? {};

    // Build per-network policy overrides from networkProfiles
    const perNetworkPolicies: Record<string, any> = {};
    const networkProfiles = init.networkProfiles ?? {};
    for (const [id, profile] of Object.entries<any>(networkProfiles)) {
      const policy = profile?.policy;
      if (policy && Object.keys(policy).length > 0) {
        perNetworkPolicies[profile.name ?? id] = policy;
      }
    }

    // Build comprehensive DoH status
    const dohConfig = init.dohConfig ?? {};
    const globalDohPolicy = globalPolicy.doh;
    const dohStatus: Record<string, any> = {
      globalEnabled: !!(globalDohPolicy?.state),
      selectedServers: dohConfig.selectedServers ?? [],
      customizedServers: dohConfig.customizedServers ?? [],
      allServers: dohConfig.allServers ?? [],
    };

    // Check per-network DoH overrides
    const perNetworkDoh: Record<string, any> = {};
    for (const [id, profile] of Object.entries<any>(networkProfiles)) {
      const networkDoh = profile?.policy?.doh;
      if (networkDoh) {
        perNetworkDoh[profile.name ?? id] = {
          enabled: !!(networkDoh.state),
          ...networkDoh,
        };
      }
    }
    if (Object.keys(perNetworkDoh).length > 0) {
      dohStatus.perNetwork = perNetworkDoh;
    }
    dohStatus.activeAnywhere = dohStatus.globalEnabled ||
      Object.values(perNetworkDoh).some((n: any) => n.enabled);

    // System Vulnerabilities scan status
    // The "System Vulnerabilities" feature in the Firewalla app maps to two policies:
    //   - device_service_scan: open port/service detection
    //   - weak_password_scan: weak password detection on common ports
    // Note: vulScan is a DIFFERENT feature and should NOT be used here.
    const deviceServiceScan = globalPolicy.device_service_scan ?? false;
    const weakPasswordScan = globalPolicy.weak_password_scan ?? {};

    const scanStatus: Record<string, any> = {
      systemVulnerabilities: {
        deviceServiceScan: !!deviceServiceScan,
        weakPasswordScan: {
          state: !!weakPasswordScan.state,
          cron: weakPasswordScan.cron ?? null,
        },
        lastScanTimestamp: init.lastScanTimestamp ?? null,
      },
      externalPortScan: init.extScan ?? {},
      portForwarding: {
        upnp: init.scan ?? {},
      },
      weakPasswordScanResult: init.weakPasswordScanResult ?? {},
    };

    return {
      features: init.features ?? {},
      runtimeFeatures: init.runtimeFeatures ?? {},
      runtimeDynamicFeatures: init.runtimeDynamicFeatures ?? {},
      globalPolicy,
      perNetworkPolicies,
      dohStatus,
      scanStatus,
    };
  }

  async getNetworkConfig(): Promise<any> {
    this.ensureConnected();
    const msg = new FWGetMessage("networkConfig");
    return FWGroupApi.sendMessageToBox(this.fwGroup!, msg);
  }

  async getTargetLists(): Promise<any> {
    this.ensureConnected();
    const msg = new FWGetMessage("targetLists");
    return FWGroupApi.sendMessageToBox(this.fwGroup!, msg);
  }

  async getAuditLogs(options: FlowQueryOptions = {}): Promise<any> {
    this.ensureConnected();
    const target = options.mac || "0.0.0.0";
    const data: Record<string, any> = {
      item: "auditLogs",
      apiVer: 3,
      count: options.count ?? 100,
      audit: true,
    };
    if (options.ts) data.ts = options.ts;
    if (options.ets) data.ets = options.ets;
    if (options.asc !== undefined) data.asc = options.asc;
    if (options.include?.length) data.include = options.include;
    if (options.exclude?.length) data.exclude = options.exclude;

    const msg = new FWMessage("get", data, target);
    return FWGroupApi.sendMessageToBox(this.fwGroup!, msg);
  }
}
