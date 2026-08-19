/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx}",
        "./components/**/*.{js,jsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#FF6B00",
            },
            boxShadow: {
                soft: "0 10px 30px rgba(15, 23, 42, 0.08)",
            },
        },
    },
    plugins: [],
};
