import { DecimalPipe } from '@angular/common';
import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AssistantService } from '../../core/services/assistant.service';
import { ChatMessage } from '../../core/models';

// Conversational analyst over the live grid data. Answers stream in token-by-token, and the
// data queries the model runs are surfaced as chips so you can see it's grounded, not guessing.
@Component({
  selector: 'app-assistant',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './assistant.html',
  styleUrl: './assistant.scss',
})
export class Assistant {
  private readonly assistant = inject(AssistantService);

  private readonly scrollRef = viewChild<ElementRef<HTMLDivElement>>('scroll');
  private streamSub: Subscription | null = null;

  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly draft = signal('');
  protected readonly busy = signal(false);

  // Must match MaxQuestionLength on the server; keeps a single question from blowing up token cost.
  protected readonly maxQuestionLength = 4000;
  protected readonly remaining = computed(() => this.maxQuestionLength - this.draft().length);
  protected readonly tooLong = computed(() => this.draft().length > this.maxQuestionLength);

  protected readonly suggestions = [
    'Which device has used the most energy in the last 24 hours?',
    'Are there any unresolved critical alerts right now?',
    'Summarize consumption trends for the EV chargers today.',
    'What does the data show about the solar inverters this morning?',
  ];

  // Friendly labels for the tool chips.
  private readonly toolLabels: Record<string, string> = {
    list_devices: 'Listing devices',
    get_alerts: 'Querying alerts',
    get_hourly_consumption: 'Aggregating consumption',
    get_recent_readings: 'Reading latest measurements',
  };

  constructor() {
    // Keep the transcript pinned to the newest message as it grows.
    effect(() => {
      this.messages();
      queueMicrotask(() => {
        const el = this.scrollRef()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  protected toolLabel(name: string): string {
    return this.toolLabels[name] ?? name;
  }

  protected useSuggestion(text: string): void {
    this.draft.set(text);
    this.send();
  }

  protected send(): void {
    const question = this.draft().trim();
    if (!question || this.busy() || this.tooLong()) {
      return;
    }

    const history = this.messages()
      .filter((m) => !m.error && m.content.trim().length > 0)
      .map((m) => ({ role: m.role, content: m.content }));

    this.messages.update((list) => [
      ...list,
      { role: 'user', content: question },
      { role: 'assistant', content: '', streaming: true, tools: [] },
    ]);
    this.draft.set('');
    this.busy.set(true);

    this.streamSub = this.assistant.ask({ question, history }).subscribe((event) => {
      switch (event.type) {
        case 'token':
          this.appendToAssistant(event.text);
          break;
        case 'tool':
          this.addTool(event.name);
          break;
        case 'error':
          this.patchAssistant((m) => {
            m.content = m.content || event.message;
            m.error = true;
            m.streaming = false;
          });
          break;
        case 'done':
          this.finish();
          break;
      }
    });
  }

  protected stop(): void {
    this.streamSub?.unsubscribe();
    this.streamSub = null;
    this.finish();
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Enter sends; Shift+Enter inserts a newline.
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  private appendToAssistant(text: string): void {
    this.patchAssistant((m) => (m.content += text));
  }

  private addTool(name: string): void {
    this.patchAssistant((m) => {
      m.tools = [...(m.tools ?? []), name];
    });
  }

  private finish(): void {
    this.patchAssistant((m) => (m.streaming = false));
    this.busy.set(false);
    this.streamSub = null;
  }

  // Mutates a copy of the last (assistant) message so the signal emits a new reference.
  private patchAssistant(mutate: (message: ChatMessage) => void): void {
    this.messages.update((list) => {
      if (list.length === 0) return list;
      const next = [...list];
      const last = { ...next[next.length - 1] };
      mutate(last);
      next[next.length - 1] = last;
      return next;
    });
  }
}
