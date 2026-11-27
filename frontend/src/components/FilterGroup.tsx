export type FilterOption = {
  key: string;
  label: string;
  /** Left out until the rows have loaded, so a count is never a guess. */
  count?: number;
  on: boolean;
  choose: () => void;
};

/** The buttons beside a table's search box that narrow its rows, each with how many it would show. */
export function FilterGroup({ label, options }: { label: string; options: FilterOption[] }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-control bg-panel p-1">
      {options.map(({ key, label: text, count, on, choose }) => (
        <button
          key={key}
          type="button"
          aria-pressed={on}
          onClick={choose}
          className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold ${on ? "bg-sea-green text-midnight" : "hover:bg-page"}`}
        >
          {text}
          {count !== undefined && <span className="num font-normal">{count}</span>}
        </button>
      ))}
    </div>
  );
}
