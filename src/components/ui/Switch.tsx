export default function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  describedBy,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      className={`closer-switch ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={onChange}
    >
      <span />
    </button>
  );
}
