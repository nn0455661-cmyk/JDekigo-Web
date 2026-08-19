export default function Button({
    type = "button",
    children,
    className = "",
    ...props
}) {
    return (
        <button
            type={type}
            className={`inline-flex items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-white shadow-[0_8px_16px_rgba(255,107,0,0.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--color-primary-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-70 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
