export function getUserId(): string {
  let id = localStorage.getItem("userId");

  if (!id) {
    id = window.crypto.randomUUID();
    localStorage.setItem("userId", id);
  }

  return id;
}
