export default function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  describedBy,
  title,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  describedBy?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={`closer-switch ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      title={title ?? label}
      disabled={disabled}
      onClick={onChange}
    >
      <span />
    </button>
  );
}
