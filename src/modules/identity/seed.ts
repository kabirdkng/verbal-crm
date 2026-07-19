import { DEMO_PASSWORD, getStore, seedDemoData } from "@/lib/store";
import { hashPassword } from "@/lib/password";

let seeded = false;

export function ensureDemoSeed(): void {
  seedDemoData();
  if (seeded) {
    return;
  }

  const store = getStore();
  const demoUser = store.users.find((user) => user.id === "u_demo_admin");
  if (demoUser && (demoUser.passwordHash === "pending" || !demoUser.passwordHash.includes(":"))) {
    demoUser.passwordHash = hashPassword(DEMO_PASSWORD);
  }

  seeded = true;
}
