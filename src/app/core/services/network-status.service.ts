// src/app/services/network-status.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ENetworkStatus } from '../enums/network-status.enum';

@Injectable({
  providedIn: 'root' // Cung cấp service ở cấp độ root, có thể dùng ở mọi nơi
})
export class NetworkStatusService {
  // Dùng BehaviorSubject để lưu trữ trạng thái mạng hiện tại và phát ra khi có thay đổi.
  // Khởi tạo với giá trị ban đầu từ navigator.onLine.
  private onlineStatus$ = new BehaviorSubject<ENetworkStatus>(ENetworkStatus.Online);

  constructor() {
    // Lắng nghe các sự kiện online và offline của trình duyệt
    const online$ = fromEvent(window, 'online').pipe(map(() => ENetworkStatus.Online));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => ENetworkStatus.Offline));

    // Gộp hai stream sự kiện thành một
    merge(online$, offline$).subscribe(status => {
      // Khi có sự kiện mới, cập nhật BehaviorSubject
      this.onlineStatus$.next(status);
    });
  }

  /**
   * Trả về một Observable để các component có thể theo dõi trạng thái mạng.
   */
  public onlineStatus(): Observable<ENetworkStatus> {
    return this.onlineStatus$.asObservable();
  }

  /**
   * Trả về trạng thái mạng hiện tại một cách trực tiếp.
   */
  public getCurrentStatus(): ENetworkStatus {
    return this.onlineStatus$.getValue();
  }
}