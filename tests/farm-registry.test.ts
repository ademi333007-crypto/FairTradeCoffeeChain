// FarmRegistry.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface FarmDetails {
  owner: string;
  name: string;
  location: string;
  registeredAt: number;
  lastUpdated: number;
}

interface Certification {
  certified: boolean;
  certifier: string;
  certificationLevel: string;
  expiry: number;
  notes: string;
}

interface HistoryEntry {
  action: string;
  timestamp: number;
  performer: string;
  details: string;
}

interface FarmCategories {
  primaryCategory: string;
  tags: string[];
}

interface Collaborator {
  role: string;
  permissions: string[];
  addedAt: number;
}

interface FarmStatus {
  status: string;
  visibility: boolean;
  lastUpdated: number;
}

interface RevenueShare {
  percentage: number;
  totalReceived: number;
  lastPayout: number;
}

interface ContractState {
  farms: Map<number, FarmDetails>;
  certifications: Map<number, Certification>;
  certificationHistory: Map<string, HistoryEntry>; // Key: `${farmId}-${entryId}`
  historyCounters: Map<number, number>;
  farmCategories: Map<number, FarmCategories>;
  collaborators: Map<string, Collaborator>; // Key: `${farmId}-${collaborator}`
  farmStatus: Map<number, FarmStatus>;
  revenueShares: Map<string, RevenueShare>; // Key: `${farmId}-${participant}`
  contractAdmin: string;
  farmCounter: number;
  paused: boolean;
}

// Mock contract implementation
class FarmRegistryMock {
  private state: ContractState = {
    farms: new Map(),
    certifications: new Map(),
    certificationHistory: new Map(),
    historyCounters: new Map(),
    farmCategories: new Map(),
    collaborators: new Map(),
    farmStatus: new Map(),
    revenueShares: new Map(),
    contractAdmin: "deployer",
    farmCounter: 0,
    paused: false,
  };

  private ERR_UNAUTHORIZED = 100;
  private ERR_ALREADY_REGISTERED = 101;
  private ERR_INVALID_DETAILS = 102;
  private ERR_NOT_FOUND = 103;
  private ERR_INVALID_CERTIFICATION = 104;
  private ERR_MAX_COLLABORATORS = 105;
  private ERR_INVALID_PERCENTAGE = 106;
  private ERR_PAUSED = 107;
  private MAX_HISTORY_ENTRIES = 50;
  private MAX_SHARE_PERCENTAGE = 100;

  private getBlockHeight(): number {
    return Date.now(); // Mock block height as timestamp
  }

  private isAdmin(caller: string): boolean {
    return caller === this.state.contractAdmin;
  }

  private isFarmOwner(farmId: number, caller: string): boolean {
    const farm = this.state.farms.get(farmId);
    return !!farm && farm.owner === caller;
  }

  private addHistoryEntry(farmId: number, action: string, details: string): ClarityResponse<boolean> {
    const currentCount = this.state.historyCounters.get(farmId) ?? 0;
    const newEntryId = currentCount + 1;
    if (newEntryId > this.MAX_HISTORY_ENTRIES) {
      return { ok: false, value: this.ERR_INVALID_DETAILS };
    }
    const key = `${farmId}-${newEntryId}`;
    this.state.certificationHistory.set(key, {
      action,
      timestamp: this.getBlockHeight(),
      performer: "caller", // Mock tx-sender as "caller"
      details,
    });
    this.state.historyCounters.set(farmId, newEntryId);
    return { ok: true, value: true };
  }

  registerFarm(caller: string, name: string, location: string, primaryCategory: string, tags: string[]): ClarityResponse<number> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    if (name.length === 0 || location.length === 0) {
      return { ok: false, value: this.ERR_INVALID_DETAILS };
    }
    const farmId = this.state.farmCounter + 1;
    const timestamp = this.getBlockHeight();
    this.state.farms.set(farmId, {
      owner: caller,
      name,
      location,
      registeredAt: timestamp,
      lastUpdated: timestamp,
    });
    this.state.farmCategories.set(farmId, { primaryCategory, tags });
    this.state.farmStatus.set(farmId, { status: "Pending", visibility: true, lastUpdated: timestamp });
    this.addHistoryEntry(farmId, "Registered", "Initial farm registration");
    this.state.farmCounter = farmId;
    return { ok: true, value: farmId };
  }

  updateFarmDetails(caller: string, farmId: number, newName: string, newLocation: string): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const farm = this.state.farms.get(farmId);
    if (!farm) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (!this.isFarmOwner(farmId, caller)) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    const timestamp = this.getBlockHeight();
    this.state.farms.set(farmId, { ...farm, name: newName, location: newLocation, lastUpdated: timestamp });
    this.addHistoryEntry(farmId, "Updated Details", "Changed name and location");
    return { ok: true, value: true };
  }

  certifyFarm(caller: string, farmId: number, level: string, expiry: number, notes: string): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const farm = this.state.farms.get(farmId);
    if (!farm) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (!this.isAdmin(caller) && !this.isFarmOwner(farmId, caller)) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.certifications.set(farmId, { certified: true, certifier: caller, certificationLevel: level, expiry, notes });
    this.addHistoryEntry(farmId, "Certified", `Level: ${level}`);
    return { ok: true, value: true };
  }

  revokeCertification(caller: string, farmId: number, reason: string): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const cert = this.state.certifications.get(farmId);
    if (!cert) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (!this.isAdmin(caller)) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.certifications.set(farmId, { ...cert, certified: false });
    this.addHistoryEntry(farmId, "Revoked", reason);
    return { ok: true, value: true };
  }

  addCollaborator(caller: string, farmId: number, collaborator: string, role: string, permissions: string[]): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const farm = this.state.farms.get(farmId);
    if (!farm) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (!this.isFarmOwner(farmId, caller)) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    const key = `${farmId}-${collaborator}`;
    if (this.state.collaborators.has(key)) {
      return { ok: false, value: this.ERR_ALREADY_REGISTERED };
    }
    this.state.collaborators.set(key, { role, permissions, addedAt: this.getBlockHeight() });
    this.addHistoryEntry(farmId, "Added Collaborator", `Role: ${role}`);
    return { ok: true, value: true };
  }

  updateFarmStatus(caller: string, farmId: number, newStatus: string, newVisibility: boolean): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const status = this.state.farmStatus.get(farmId);
    if (!status) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (!this.isFarmOwner(farmId, caller) && !this.isAdmin(caller)) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    const timestamp = this.getBlockHeight();
    this.state.farmStatus.set(farmId, { status: newStatus, visibility: newVisibility, lastUpdated: timestamp });
    this.addHistoryEntry(farmId, "Status Updated", newStatus);
    return { ok: true, value: true };
  }

  setRevenueShare(caller: string, farmId: number, participant: string, percentage: number): ClarityResponse<boolean> {
    if (this.state.paused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const farm = this.state.farms.get(farmId);
    if (!farm) {
      return { ok: false, value: this.ERR_NOT_FOUND };
    }
    if (!this.isFarmOwner(farmId, caller)) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    if (percentage > this.MAX_SHARE_PERCENTAGE) {
      return { ok: false, value: this.ERR_INVALID_PERCENTAGE };
    }
    const key = `${farmId}-${participant}`;
    this.state.revenueShares.set(key, { percentage, totalReceived: 0, lastPayout: 0 });
    this.addHistoryEntry(farmId, "Set Revenue Share", `Participant: ${participant}`);
    return { ok: true, value: true };
  }

  pauseContract(caller: string): ClarityResponse<boolean> {
    if (!this.isAdmin(caller)) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = true;
    return { ok: true, value: true };
  }

  unpauseContract(caller: string): ClarityResponse<boolean> {
    if (!this.isAdmin(caller)) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.paused = false;
    return { ok: true, value: true };
  }

  getFarmDetails(farmId: number): ClarityResponse<FarmDetails | null> {
    return { ok: true, value: this.state.farms.get(farmId) ?? null };
  }

  getCertification(farmId: number): ClarityResponse<Certification | null> {
    return { ok: true, value: this.state.certifications.get(farmId) ?? null };
  }

  getCertificationHistoryEntry(farmId: number, entryId: number): ClarityResponse<HistoryEntry | null> {
    const key = `${farmId}-${entryId}`;
    return { ok: true, value: this.state.certificationHistory.get(key) ?? null };
  }

  getHistoryCount(farmId: number): ClarityResponse<number> {
    return { ok: true, value: this.state.historyCounters.get(farmId) ?? 0 };
  }

  isContractPaused(): ClarityResponse<boolean> {
    return { ok: true, value: this.state.paused };
  }
}

// Test setup
const accounts = {
  deployer: "deployer",
  farmer: "wallet_1",
  certifier: "wallet_2",
  collaborator: "wallet_3",
};

describe("FarmRegistry Contract", () => {
  let contract: FarmRegistryMock;

  beforeEach(() => {
    contract = new FarmRegistryMock();
    vi.resetAllMocks();
  });

  it("should register a new farm successfully", () => {
    const result = contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic", "fairtrade"]);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(1);

    const details = contract.getFarmDetails(1);
    expect(details.value).toMatchObject({
      owner: accounts.farmer,
      name: "Test Farm",
      location: "Colombia",
    });
  });

  it("should prevent registration with invalid details", () => {
    const result = contract.registerFarm(accounts.farmer, "", "Colombia", "Coffee", ["organic"]);
    expect(result).toEqual({ ok: false, value: 102 });
  });

  it("should update farm details by owner", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);

    const updateResult = contract.updateFarmDetails(accounts.farmer, 1, "Updated Farm", "Brazil");
    expect(updateResult).toEqual({ ok: true, value: true });

    const details = contract.getFarmDetails(1);
    expect(details.value?.name).toBe("Updated Farm");
    expect(details.value?.location).toBe("Brazil");
  });

  it("should prevent non-owner from updating details", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);

    const updateResult = contract.updateFarmDetails(accounts.certifier, 1, "Updated Farm", "Brazil");
    expect(updateResult).toEqual({ ok: false, value: 100 });
  });

  it("should certify farm by admin or owner", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);

    const certResult = contract.certifyFarm(accounts.farmer, 1, "FairTrade Premium", 1000000, "Certified for ethical practices");
    expect(certResult).toEqual({ ok: true, value: true });

    const cert = contract.getCertification(1);
    expect(cert.value?.certified).toBe(true);
    expect(cert.value?.certificationLevel).toBe("FairTrade Premium");
  });

  it("should prevent unauthorized certification", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);

    const certResult = contract.certifyFarm(accounts.collaborator, 1, "FairTrade Premium", 1000000, "Unauthorized");
    expect(certResult).toEqual({ ok: false, value: 100 });
  });

  it("should revoke certification by admin", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);
    contract.certifyFarm(accounts.deployer, 1, "FairTrade Premium", 1000000, "Certified");

    const revokeResult = contract.revokeCertification(accounts.deployer, 1, "Non-compliance");
    expect(revokeResult).toEqual({ ok: true, value: true });

    const cert = contract.getCertification(1);
    expect(cert.value?.certified).toBe(false);
  });

  it("should add collaborator by owner", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);

    const addResult = contract.addCollaborator(accounts.farmer, 1, accounts.collaborator, "Manager", ["update-details"]);
    expect(addResult).toEqual({ ok: true, value: true });
  });

  it("should prevent adding duplicate collaborator", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);
    contract.addCollaborator(accounts.farmer, 1, accounts.collaborator, "Manager", ["update-details"]);

    const duplicateResult = contract.addCollaborator(accounts.farmer, 1, accounts.collaborator, "Manager", ["update-details"]);
    expect(duplicateResult).toEqual({ ok: false, value: 101 });
  });

  it("should set revenue share by owner", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);

    const shareResult = contract.setRevenueShare(accounts.farmer, 1, accounts.collaborator, 20);
    expect(shareResult).toEqual({ ok: true, value: true });
  });

  it("should prevent invalid revenue percentage", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);

    const shareResult = contract.setRevenueShare(accounts.farmer, 1, accounts.collaborator, 101);
    expect(shareResult).toEqual({ ok: false, value: 106 });
  });

  it("should pause and unpause contract by admin", () => {
    const pauseResult = contract.pauseContract(accounts.deployer);
    expect(pauseResult).toEqual({ ok: true, value: true });
    expect(contract.isContractPaused()).toEqual({ ok: true, value: true });

    const registerDuringPause = contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);
    expect(registerDuringPause).toEqual({ ok: false, value: 107 });

    const unpauseResult = contract.unpauseContract(accounts.deployer);
    expect(unpauseResult).toEqual({ ok: true, value: true });
    expect(contract.isContractPaused()).toEqual({ ok: true, value: false });
  });

  it("should maintain history entries", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);

    const count = contract.getHistoryCount(1);
    expect(count.value).toBe(1);

    const entry = contract.getCertificationHistoryEntry(1, 1);
    expect(entry.value?.action).toBe("Registered");
  });

  it("should prevent exceeding max history entries", () => {
    contract.registerFarm(accounts.farmer, "Test Farm", "Colombia", "Coffee", ["organic"]);

    // Simulate max entries
    for (let i = 1; i <= 50; i++) {
      contract.addHistoryEntry(1, `Action ${i}`, `Details ${i}`);
    }

    const excessResult = contract.addHistoryEntry(1, "Excess", "Too many");
    expect(excessResult).toEqual({ ok: false, value: 102 });
  });
});