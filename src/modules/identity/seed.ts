import { DEMO_PASSWORD, getStore, seedDemoData } from "@/lib/store";
import { hashPassword } from "@/lib/password";

let seeded = false;

export function ensureDemoSeed(): void {
  seedDemoData();
  if (seeded) {
    return;
  }

  const store = getStore();
  for (const id of ["u_demo_admin", "u_platform_admin"]) {
    const user = store.users.find((item) => item.id === id);
    if (user && (user.passwordHash === "pending" || !user.passwordHash.includes(":"))) {
      user.passwordHash = hashPassword(DEMO_PASSWORD);
    }
  }

  if (!store.organizations.some((o) => o.id === "org_platform")) {
    store.organizations.push({
      id: "org_platform",
      name: "Platform Control Plane",
      slug: "platform",
      aiBudgetUsd: 0,
      createdAt: new Date()
    });
  }

  seeded = true;
}
