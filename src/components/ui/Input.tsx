import styles from './Input.module.css';
import { Text } from './Text';

type FieldSize = 'md' | 'sm';

/**
 * A label above its control, for the one form in the app that has labels. Every
 * other field takes `ariaLabel` and lets its row say what it is.
 */
export function Field({
  label,
  children,
  hint,
  grow,
}: {
  label: string;
  children: React.ReactNode;
  /** What to watch out for. Under the control, never inside it as placeholder. */
  hint?: React.ReactNode;
  grow?: boolean;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the control is the caller's child, and every one of them renders a form element
    <label className={styles.labelled} data-grow={grow || undefined}>
      <Text level="label" tone="strong">
        {label}
      </Text>
      {children}
      {hint ? (
        <Text level="small" tone="muted">
          {hint}
        </Text>
      ) : null}
    </label>
  );
}

/**
 * A single-line field. `bare` drops the border for a field that sits inside a
 * card row and lets the card be the frame.
 */
export function TextInput({
  name,
  value,
  defaultValue,
  placeholder,
  size = 'md',
  bare,
  heading,
  password,
  disabled,
  required,
  ariaLabel,
  onChange,
  onKeyDown,
  autoFocus,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  size?: FieldSize;
  bare?: boolean;
  /** The note editor's title, which is the loudest thing in its card. */
  heading?: boolean;
  /** A credential. Masked, and never read back once saved. */
  password?: boolean;
  disabled?: boolean;
  required?: boolean;
  ariaLabel?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
}) {
  return (
    <input
      type={password ? 'password' : 'text'}
      className={styles.field}
      data-size={size}
      data-bare={bare || undefined}
      data-heading={heading || undefined}
      name={name}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      aria-label={ariaLabel}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      onKeyDown={onKeyDown}
      // biome-ignore lint/a11y/noAutofocus: quick capture is the point of the screen it is on
      autoFocus={autoFocus}
    />
  );
}

export function Textarea({
  name,
  value,
  defaultValue,
  placeholder,
  rows,
  mono,
  bare,
  ariaLabel,
  onChange,
  onKeyDown,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  /** Markdown, so the mono stack. */
  mono?: boolean;
  /** No border: the card is the frame. */
  bare?: boolean;
  ariaLabel?: string;
  onChange?: (value: string) => void;
  /** Editor keys — Tab, Escape, the save shortcut — belong to the caller. */
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <textarea
      className={styles.textarea}
      data-mono={mono || undefined}
      data-bare={bare || undefined}
      name={name}
      value={value}
      defaultValue={defaultValue}
      placeholder={placeholder}
      rows={rows}
      aria-label={ariaLabel}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      onKeyDown={onKeyDown}
    />
  );
}

export type Option = { value: string; label: string };

export function Select({
  options,
  name,
  value,
  defaultValue,
  size = 'md',
  disabled,
  ariaLabel,
  onChange,
}: {
  options: readonly Option[];
  name?: string;
  value?: string;
  defaultValue?: string;
  size?: FieldSize;
  disabled?: boolean;
  ariaLabel?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <select
      className={styles.select}
      data-size={size}
      name={name}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** The browser's picker. Nothing in this app renders a calendar of its own. */
export function DateInput({
  name,
  value,
  defaultValue,
  size = 'md',
  ariaLabel,
  onChange,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  size?: FieldSize;
  ariaLabel?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <input
      type="date"
      className={styles.date}
      data-size={size}
      name={name}
      value={value}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    />
  );
}

/**
 * A `button` rather than an `input`: the row it lives in toggles through a
 * Server Action, and there is no form to submit.
 */
export function Checkbox({
  checked,
  onToggle,
  ariaLabel,
  disabled,
}: {
  checked: boolean;
  onToggle?: () => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={styles.checkbox}
      data-checked={checked || undefined}
      aria-pressed={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onToggle}
    >
      ✓
    </button>
  );
}
