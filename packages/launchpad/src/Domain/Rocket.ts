import { AggregateRoot } from '@gravito/enterprise'
import {
  MissionAssigned,
  RefurbishmentCompleted,
  RocketIgnited,
  RocketSplashedDown,
} from './Events'
import type { Mission } from './Mission'
import { RocketStatus } from './RocketStatus'

export class Rocket extends AggregateRoot<string> {
  private _status: RocketStatus = RocketStatus.IDLE
  private _currentMission: Mission | null = null
  private _containerId: string
  private _assignedDomain: string | null = null

  constructor(id: string, containerId: string) {
    super(id)
    this._containerId = containerId
  }

  get status() {
    return this._status
  }
  get currentMission() {
    return this._currentMission
  }
  get containerId() {
    return this._containerId
  }
  get assignedDomain() {
    return this._assignedDomain
  }

  /**
   * 分配域名
   */
  public assignDomain(domain: string): void {
    this._assignedDomain = domain
  }

  /**
   * 分配任務 (指派任務給 IDLE 的火箭)
   */
  public assignMission(mission: Mission): void {
    if (this._status !== RocketStatus.IDLE) {
      throw new Error(`無法指派任務：火箭 ${this.id} 狀態為 ${this._status}，非 IDLE`)
    }

    this._status = RocketStatus.PREPARING
    this._currentMission = mission
    this.addDomainEvent(new MissionAssigned(this.id, mission.id))
  }

  /**
   * 點火啟動 (應用程式啟動成功)
   */
  public ignite(): void {
    if (this._status !== RocketStatus.PREPARING) {
      throw new Error(`無法點火：火箭 ${this.id} 尚未進入 PREPARING 狀態`)
    }

    this._status = RocketStatus.ORBITING
    this.addDomainEvent(new RocketIgnited(this.id))
  }

  /**
   * 任務降落 (PR 合併或關閉，暫停服務)
   */
  public splashDown(): void {
    if (this._status !== RocketStatus.ORBITING) {
      throw new Error(`無法降落：火箭 ${this.id} 不在運行軌道上`)
    }

    this._status = RocketStatus.REFURBISHING
    this.addDomainEvent(new RocketSplashedDown(this.id))
  }

  /**
   * 翻新完成 (清理完畢，回歸池中)
   */
  public finishRefurbishment(): void {
    if (this._status !== RocketStatus.REFURBISHING) {
      throw new Error(`無法完成翻新：火箭 ${this.id} 不在 REFURBISHING 狀態`)
    }

    this._status = RocketStatus.IDLE
    this._currentMission = null
    this.addDomainEvent(new RefurbishmentCompleted(this.id))
  }

  /**
   * 火箭除役 (移除容器)
   */
  public decommission(): void {
    this._status = RocketStatus.DECOMMISSIONED
  }

  public toJSON() {
    return {
      id: this.id,
      containerId: this.containerId,
      status: this._status,
      currentMission: this._currentMission,
      assignedDomain: this._assignedDomain,
    }
  }

  public static fromJSON(data: any): Rocket {
    const rocket = new Rocket(data.id, data.containerId)
    rocket._status = data.status
    rocket._currentMission = data.currentMission
    rocket._assignedDomain = data.assignedDomain
    return rocket
  }
}
