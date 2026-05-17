const STORAGE_KEY = "icare-custom-accounts";

export function getCustomAccounts(): Record<
  string,
  { name: string; role: string }
> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomAccount(
  email: string,
  data: { name: string; role: string }
) {
  const accounts = getCustomAccounts();
  accounts[email.toLowerCase()] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function removeCustomAccount(email: string) {
  const accounts = getCustomAccounts();
  delete accounts[email.toLowerCase()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}
