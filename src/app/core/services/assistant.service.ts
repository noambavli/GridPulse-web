import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssistantEvent, AssistantRequest } from '../models';
import { AuthService } from './auth.service';

// Talks to the streaming assistant endpoint. Uses fetch (not HttpClient) because we need to
// read a Server-Sent Events stream incrementally; EventSource can't POST or send auth headers.
@Injectable({ providedIn: 'root' })
export class AssistantService {
  private readonly auth = inject(AuthService);
  private readonly baseUrl = environment.apiBaseUrl;

  ask(request: AssistantRequest): Observable<AssistantEvent> {
    return new Observable<AssistantEvent>((subscriber) => {
      const controller = new AbortController();

      (async () => {
        try {
          const response = await fetch(`${this.baseUrl}/assistant/ask`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
              ...(this.auth.token ? { Authorization: `Bearer ${this.auth.token}` } : {}),
            },
            body: JSON.stringify(request),
            signal: controller.signal,
          });

          if (!response.ok || !response.body) {
            subscriber.next({
              type: 'error',
              message: `Assistant request failed (${response.status}).`,
            });
            subscriber.complete();
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE frames are separated by a blank line.
            let boundary: number;
            while ((boundary = buffer.indexOf('\n\n')) !== -1) {
              const frame = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);

              const event = this.parseFrame(frame);
              if (event) {
                subscriber.next(event);
                if (event.type === 'done') {
                  subscriber.complete();
                  return;
                }
              }
            }
          }

          subscriber.complete();
        } catch (err) {
          if (controller.signal.aborted) return;
          subscriber.next({
            type: 'error',
            message: err instanceof Error ? err.message : 'Network error contacting the assistant.',
          });
          subscriber.complete();
        }
      })();

      // Aborts the in-flight request when the caller unsubscribes.
      return () => controller.abort();
    });
  }

  private parseFrame(frame: string): AssistantEvent | null {
    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    const raw = dataLines.join('\n');
    const data = raw ? JSON.parse(raw) : {};

    switch (eventName) {
      case 'token':
        return { type: 'token', text: data.text ?? '' };
      case 'tool':
        return { type: 'tool', name: data.name ?? '', arguments: data.arguments ?? '' };
      case 'error':
        return { type: 'error', message: data.message ?? 'Unknown error.' };
      case 'done':
        return { type: 'done' };
      default:
        return null;
    }
  }
}
