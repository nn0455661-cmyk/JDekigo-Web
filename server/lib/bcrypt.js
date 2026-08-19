import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password) {
    return bcrypt.hash(String(password), SALT_ROUNDS);
}

export async function comparePassword(password, hashedPassword) {
    return bcrypt.compare(String(password), String(hashedPassword));
}
