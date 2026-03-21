import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-description-modal',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="modal">
      <div class="modal-header">
        <mat-icon class="title-icon">description</mat-icon>
        <h2>{{ data.name }}</h2>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <div class="modal-body">
        <pre class="description">{{ data.description }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .modal {
      background: var(--bg-secondary);
      display: flex;
      flex-direction: column;
      max-height: 80vh;
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }

    .title-icon {
      color: var(--accent);
      font-size: 20px;
    }

    h2 {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      color: var(--accent);
      flex: 1;
    }

    .close-btn {
      color: var(--text-muted) !important;
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .description {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      line-height: 1.8;
      color: var(--text-primary);
      white-space: pre-wrap;
      word-break: break-word;
    }
  `],
})
export class DescriptionModalComponent {
  data = inject<{ name: string; description: string }>(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef);
}
