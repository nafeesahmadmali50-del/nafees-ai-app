import { UserProfile, StoredUserAccount } from '../types';

const STORAGE_KEYS = {
  ACCOUNTS: 'nafees_ai_user_accounts_v1',
  ACTIVE_USER_ID: 'nafees_ai_active_user_id_v1',
};

// Cryptographic SHA-256 password hashing with salt
async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateStableUserId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `usr_${Date.now().toString(36)}_${hex}`;
}

let memoryAccounts: StoredUserAccount[] | null = null;
let memoryActiveUserId: string | null = null;

export function getAllAccounts(): StoredUserAccount[] {
  if (memoryAccounts !== null) {
    return memoryAccounts;
  }
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.ACCOUNTS) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryAccounts = parsed;
        return parsed;
      }
    }
  } catch {
    // Silently proceed with memory store
  }
  memoryAccounts = [];
  return memoryAccounts;
}

function sanitizeAccountForStorage(acc: StoredUserAccount): StoredUserAccount {
  // Prevent any single account avatar from blowing up the storage quota
  if (acc.avatarUrl && acc.avatarUrl.startsWith('data:') && acc.avatarUrl.length > 15000) {
    return {
      ...acc,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(acc.name || 'user')}`,
    };
  }
  return acc;
}

function saveAccounts(accounts: StoredUserAccount[]): boolean {
  // Always update memory store first so profile updates and logins succeed in this session
  memoryAccounts = accounts.map(sanitizeAccountForStorage);

  if (typeof window === 'undefined') return true;

  try {
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(memoryAccounts));
    return true;
  } catch {
    // If quota exceeded or storage restricted, sanitize large payloads aggressively
    try {
      const ultraLight = memoryAccounts.map((acc) => {
        if (acc.avatarUrl && acc.avatarUrl.startsWith('data:')) {
          return {
            ...acc,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(acc.name || 'user')}`,
          };
        }
        return acc;
      });
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(ultraLight));
      return true;
    } catch {
      // Memory store is already updated, so the app remains fully functional
      return true;
    }
  }
}

export function getCurrentUser(): UserProfile | null {
  try {
    let activeId = memoryActiveUserId;
    if (!activeId && typeof window !== 'undefined') {
      activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
    }
    if (!activeId) {
      memoryActiveUserId = null;
      return null;
    }
    const accounts = getAllAccounts();
    const found = accounts.find((a) => a.id === activeId);
    if (!found) {
      setCurrentUserId(null);
      return null;
    }
    memoryActiveUserId = activeId;
    // Strip password credentials before returning
    const { passwordHash, salt, ...profile } = found;
    return profile;
  } catch {
    return null;
  }
}

export function setCurrentUserId(userId: string | null): void {
  memoryActiveUserId = userId;
  try {
    if (typeof window !== 'undefined') {
      if (userId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, userId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
        sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
      }
    }
  } catch {
    // In-memory state already updated
  }
}

// Register new user
export async function registerUser(
  name: string,
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const trimmedName = name.trim();
  const trimmedIdentifier = identifier.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (!trimmedName) {
    return { success: false, error: 'कृपया अपना नाम दर्ज करें (Please enter your name)' };
  }
  if (!trimmedIdentifier) {
    return { success: false, error: 'कृपया मोबाइल नंबर या ईमेल दर्ज करें (Please enter mobile or email)' };
  }
  if (trimmedPassword.length < 4) {
    return { success: false, error: 'पासवर्ड कम से कम 4 अक्षरों का होना चाहिए (Password must be at least 4 characters)' };
  }

  const accounts = getAllAccounts();
  const existing = accounts.find((a) => a.identifier.toLowerCase() === trimmedIdentifier);
  if (existing) {
    return {
      success: false,
      error: 'यह मोबाइल नंबर या ईमेल पहले से पंजीकृत है। कृपया लॉगिन करें। (Account already exists, please login)',
    };
  }

  const salt = generateSalt();
  const passwordHash = await sha256(trimmedPassword + salt);

  const newUser: StoredUserAccount = {
    id: generateStableUserId(),
    name: trimmedName,
    identifier: trimmedIdentifier,
    avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmedName)}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    passwordHash,
    salt,
  };

  accounts.push(newUser);
  saveAccounts(accounts);
  setCurrentUserId(newUser.id);

  const { passwordHash: _, salt: __, ...profile } = newUser;
  return { success: true, user: profile };
}

// Login user
export async function loginUser(
  identifier: string,
  password: string,
  name?: string
): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const trimmedIdentifier = identifier.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (!trimmedIdentifier) {
    return { success: false, error: 'कृपया अपना मोबाइल नंबर या ईमेल दर्ज करें' };
  }
  if (!trimmedPassword) {
    return { success: false, error: 'कृपया अपना पासवर्ड दर्ज करें' };
  }

  const accounts = getAllAccounts();
  const user = accounts.find((a) => a.identifier.toLowerCase() === trimmedIdentifier);

  if (!user) {
    return {
      success: false,
      error: 'इस मोबाइल या ईमेल से कोई खाता नहीं मिला। कृपया पहले नया खाता बनाएं।',
    };
  }

  const testHash = await sha256(trimmedPassword + user.salt);
  if (testHash !== user.passwordHash) {
    return { success: false, error: 'पासवर्ड सही नहीं है। कृपया दोबारा प्रयास करें।' };
  }

  if (name && name.trim()) {
    user.name = name.trim();
    saveAccounts(accounts);
  }

  setCurrentUserId(user.id);
  const { passwordHash: _, salt: __, ...profile } = user;
  return { success: true, user: profile };
}

// Logout user
export function logoutUser(): void {
  setCurrentUserId(null);
  memoryActiveUserId = null;
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
      sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
      localStorage.removeItem('nafees_ai_active_session');
      sessionStorage.removeItem('nafees_ai_active_session');
      localStorage.removeItem('nafees_ai_session_token');
      sessionStorage.removeItem('nafees_ai_session_token');
    }
  } catch {
    // Session state cleared
  }
}

// Update profile details
export function updateUserProfile(
  userId: string,
  updates: { name?: string; identifier?: string; avatarUrl?: string }
): { success: boolean; user?: UserProfile; error?: string } {
  const accounts = getAllAccounts();
  const index = accounts.findIndex((a) => a.id === userId);
  if (index === -1) {
    return { success: false, error: 'उपयोगकर्ता नहीं मिला' };
  }

  const existing = accounts[index];
  if (updates.name && updates.name.trim()) {
    existing.name = updates.name.trim();
  }
  if (updates.identifier && updates.identifier.trim()) {
    existing.identifier = updates.identifier.trim().toLowerCase();
  }
  if (updates.avatarUrl !== undefined) {
    existing.avatarUrl = updates.avatarUrl;
  }
  existing.updatedAt = Date.now();

  accounts[index] = existing;
  saveAccounts(accounts);

  const { passwordHash: _, salt: __, ...profile } = existing;
  return { success: true, user: profile };
}

// Change password
export async function changeUserPassword(
  userId: string,
  currentPass: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  if (newPass.trim().length < 4) {
    return { success: false, error: 'नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए' };
  }

  const accounts = getAllAccounts();
  const index = accounts.findIndex((a) => a.id === userId);
  if (index === -1) {
    return { success: false, error: 'उपयोगकर्ता नहीं मिला' };
  }

  const user = accounts[index];
  const currentHash = await sha256(currentPass.trim() + user.salt);
  if (currentHash !== user.passwordHash) {
    return { success: false, error: 'वर्तमान पासवर्ड गलत है' };
  }

  const newSalt = generateSalt();
  const newHash = await sha256(newPass.trim() + newSalt);
  user.passwordHash = newHash;
  user.salt = newSalt;
  user.updatedAt = Date.now();

  accounts[index] = user;
  saveAccounts(accounts);
  return { success: true };
}

// Forgot Password - Reset password
export async function resetPassword(
  identifier: string,
  newPass: string
): Promise<{ success: boolean; error?: string }> {
  const trimmedId = identifier.trim().toLowerCase();
  if (!trimmedId) {
    return { success: false, error: 'कृपया पंजीकृत मोबाइल नंबर या ईमेल दर्ज करें' };
  }
  if (newPass.trim().length < 4) {
    return { success: false, error: 'नया पासवर्ड कम से कम 4 अक्षरों का होना चाहिए' };
  }

  const accounts = getAllAccounts();
  const index = accounts.findIndex((a) => a.identifier.toLowerCase() === trimmedId);
  if (index === -1) {
    return { success: false, error: 'यह मोबाइल नंबर या ईमेल पंजीकृत नहीं है।' };
  }

  const user = accounts[index];
  const newSalt = generateSalt();
  const newHash = await sha256(newPass.trim() + newSalt);

  user.passwordHash = newHash;
  user.salt = newSalt;
  user.updatedAt = Date.now();

  accounts[index] = user;
  saveAccounts(accounts);
  return { success: true };
}
