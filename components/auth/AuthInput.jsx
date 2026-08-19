"use client";

export default function AuthInput({
    id,
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    required = false,
    autoComplete,
    className = "",
}) {
    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                {label}
            </label>
            <input
                id={id}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                autoComplete={autoComplete}
                className={`form-control ${className}`.trim()}
            />
        </div>
    );
}
