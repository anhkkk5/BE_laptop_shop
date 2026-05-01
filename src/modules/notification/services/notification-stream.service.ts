import { Injectable } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable, Subject, finalize } from 'rxjs';
import { Notification } from '../entities/notification.entity.js';

@Injectable()
export class NotificationStreamService {
  private readonly userStreams = new Map<number, Set<Subject<MessageEvent>>>();

  subscribe(userId: number): Observable<MessageEvent> {
    const stream = new Subject<MessageEvent>();
    const userSubscribers = this.userStreams.get(userId) ?? new Set();
    userSubscribers.add(stream);
    this.userStreams.set(userId, userSubscribers);

    return stream.asObservable().pipe(
      finalize(() => {
        const currentSubscribers = this.userStreams.get(userId);
        if (!currentSubscribers) {
          return;
        }

        currentSubscribers.delete(stream);
        if (currentSubscribers.size === 0) {
          this.userStreams.delete(userId);
        }
      }),
    );
  }

  publishToUser(userId: number, notification: Notification): void {
    const subscribers = this.userStreams.get(userId);
    if (!subscribers || subscribers.size === 0) {
      return;
    }

    const payload = {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      data: notification.data,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };

    subscribers.forEach((stream) => {
      stream.next({ data: payload });
    });
  }
}
