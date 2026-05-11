export default function PeriodToggle({ options, selected, onChange }) {
  return (
    <div className="bg-zinc-900 p-1 rounded-xl inline-flex border border-zinc-800">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
            selected === option
              ? "bg-[var(--volt-yellow)] text-black shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
