export default function ThemedTooltip({
  label,
  children,
  className = "",
  tooltipClassName = "",
}) {
  if (!label) {
    return children;
  }

  return (
    <div className={`relative group ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`volt-tooltip left-1/2 top-full mt-2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 ${tooltipClassName}`}
      >
        {label}
      </span>
    </div>
  );
}
