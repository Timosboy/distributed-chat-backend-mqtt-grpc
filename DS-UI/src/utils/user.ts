export function getUserId(): string {
  let id = localStorage.getItem("userId");

  if (!id) {
    id = "Usuario-"+ Math.random().toString(36).slice(2);
    localStorage.setItem("userId", id);
  }

  return id;
}
