export default function Card({ children, className = "" }) {
    return (
        <div
            className={`surface-card rounded-xl p-4 transition duration-300 hover:-translate-y-0.5 ${className}`}
        >
            {children}
        </div>
    );
}
