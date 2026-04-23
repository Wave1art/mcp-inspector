import { Component, input, output, signal, effect, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { JsonSchema, JsonSchemaProperty } from '../../models/mcp.models';

interface FormField {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  enumValues?: unknown[];
  isArray: boolean;
}

@Component({
  selector: 'app-schema-form',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatSelectModule],
  template: `
    @for (field of fields(); track field.name) {
      <div class="form-row">
        @if (field.enumValues) {
          <mat-form-field appearance="outline" class="compact-field">
            <mat-label>{{ field.name }}{{ field.required ? ' *' : '' }}</mat-label>
            <mat-select
              [ngModel]="values()[field.name]"
              (ngModelChange)="onFieldChange(field.name, $event)">
              @for (opt of field.enumValues; track opt) {
                <mat-option [value]="opt">{{ opt }}</mat-option>
              }
            </mat-select>
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
          </mat-form-field>
        } @else if (field.type === 'boolean') {
          <div class="toggle-row">
            <mat-slide-toggle
              [ngModel]="!!values()[field.name]"
              (ngModelChange)="onFieldChange(field.name, $event)">
              <span class="toggle-label">{{ field.name }}{{ field.required ? ' *' : '' }}</span>
            </mat-slide-toggle>
            @if (field.description) {
              <span class="field-hint">{{ field.description }}</span>
            }
          </div>
        } @else if (field.type === 'number' || field.type === 'integer') {
          <mat-form-field appearance="outline" class="compact-field">
            <mat-label>{{ field.name }}{{ field.required ? ' *' : '' }}</mat-label>
            <input matInput type="number"
              [ngModel]="values()[field.name]"
              (ngModelChange)="onFieldChange(field.name, field.type === 'integer' ? toInt($event) : $event)">
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
          </mat-form-field>
        } @else if (field.isArray) {
          <mat-form-field appearance="outline" class="compact-field">
            <mat-label>{{ field.name }}{{ field.required ? ' *' : '' }}</mat-label>
            <input matInput type="text"
              [ngModel]="arrayToString(values()[field.name])"
              (ngModelChange)="onFieldChange(field.name, stringToArray($event))">
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            } @else {
              <mat-hint>Comma-separated values</mat-hint>
            }
          </mat-form-field>
        } @else {
          <mat-form-field appearance="outline" class="compact-field">
            <mat-label>{{ field.name }}{{ field.required ? ' *' : '' }}</mat-label>
            <input matInput type="text"
              [ngModel]="values()[field.name] ?? ''"
              (ngModelChange)="onFieldChange(field.name, $event)">
            @if (field.description) {
              <mat-hint>{{ field.description }}</mat-hint>
            }
          </mat-form-field>
        }
      </div>
    }
    @if (fields().length === 0) {
      <div class="no-params">No parameters defined</div>
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-row {
      display: flex;
      flex-direction: column;
    }

    .compact-field {
      width: 100%;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        margin-bottom: 4px;
      }

      ::ng-deep .mdc-text-field--outlined {
        --mdc-outlined-text-field-container-shape: 8px;
      }

      ::ng-deep .mat-mdc-form-field-hint {
        font-size: 10px;
        color: var(--text-muted);
      }

      ::ng-deep .mat-mdc-floating-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
      }

      ::ng-deep input.mat-mdc-input-element {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
      }
    }

    .toggle-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 0;
    }

    .toggle-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: var(--text-primary);
    }

    .field-hint {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: var(--text-muted);
      padding-left: 48px;
    }

    .no-params {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-muted);
      padding: 8px 0;
    }
  `],
})
export class SchemaFormComponent {
  readonly schema = input<JsonSchema>();
  readonly initialValues = input<Record<string, unknown>>({});
  readonly valuesChange = output<Record<string, unknown>>();

  readonly values = signal<Record<string, unknown>>({});

  readonly fields = computed<FormField[]>(() => {
    const s = this.schema();
    if (!s?.properties) return [];
    const required = s.required || [];
    return Object.entries(s.properties).map(([name, prop]) => ({
      name,
      type: prop.type || 'string',
      description: prop.description,
      required: required.includes(name),
      enumValues: prop.enum,
      isArray: prop.type === 'array',
    }));
  });

  constructor() {
    effect(() => {
      const init = this.initialValues();
      if (init && Object.keys(init).length > 0) {
        this.values.set({ ...init });
      }
    });
  }

  onFieldChange(name: string, value: unknown): void {
    this.values.update(v => {
      const next = { ...v, [name]: value };
      return next;
    });
    this.valuesChange.emit(this.values());
  }

  toInt(val: unknown): number {
    return Math.round(Number(val) || 0);
  }

  arrayToString(val: unknown): string {
    if (Array.isArray(val)) return val.join(', ');
    return '';
  }

  stringToArray(val: string): string[] {
    if (!val.trim()) return [];
    return val.split(',').map(s => s.trim());
  }
}
