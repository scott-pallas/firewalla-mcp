import {
  SecureUtil,
  FWGroupApi,
  FWGroup,
  AlarmService,
  HostService,
  NetworkService,
  InitService,
} from "node-firewalla";

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
}
