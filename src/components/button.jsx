export function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium " +
        "bg-emerald-500 text-white hover:bg-emerald-600 transition " +
        className
      }
    >
      {children}
    </button>
  );
}