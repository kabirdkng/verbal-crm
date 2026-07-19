import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { id: "org_demo" },
    update: {
      name: "Demo Organization",
      slug: "demo",
      aiBudgetUsd: Number(process.env.AI_ORG_BUDGET_USD ?? "10")
    },
    create: {
      id: "org_demo",
      name: "Demo Organization",
      slug: "demo",
      aiBudgetUsd: Number(process.env.AI_ORG_BUDGET_USD ?? "10")
    }
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: {
      name: "Demo Admin",
      passwordHash: hashPassword("demo-password"),
      isPlatformAdmin: false
    },
    create: {
      id: "u_demo_admin",
      email: "admin@demo.local",
      name: "Demo Admin",
      passwordHash: hashPassword("demo-password"),
      isPlatformAdmin: false
    }
  });

  await prisma.user.upsert({
    where: { email: "platform@verbal.local" },
    update: {
      name: "Platform Admin",
      passwordHash: hashPassword("demo-password"),
      isPlatformAdmin: true
    },
    create: {
      id: "u_platform_admin",
      email: "platform@verbal.local",
      name: "Platform Admin",
      passwordHash: hashPassword("demo-password"),
      isPlatformAdmin: true
    }
  });

  await prisma.organization.upsert({
    where: { id: "org_platform" },
    update: { name: "Platform Control Plane", slug: "platform" },
    create: {
      id: "org_platform",
      name: "Platform Control Plane",
      slug: "platform",
      aiBudgetUsd: 0
    }
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id
      }
    },
    update: { role: "admin" },
    create: {
      id: "mem_demo_admin",
      userId: user.id,
      organizationId: org.id,
      role: "admin"
    }
  });

  // Tenant-scoped tables require app.organization_id under FORCE RLS.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.organization_id', $1, true)`, org.id);

    await tx.messageTemplate.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: "welcome_followup"
        }
      },
      update: {
        body: "Hi {{name}}, thanks for messaging us. How can we help?",
        status: "approved",
        language: "en"
      },
      create: {
        id: "tpl_welcome",
        organizationId: org.id,
        name: "welcome_followup",
        language: "en",
        body: "Hi {{name}}, thanks for messaging us. How can we help?",
        status: "approved"
      }
    });

    await tx.messageTemplate.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: "auto_ack"
        }
      },
      update: {
        body: "Thanks for your message — an agent will be with you shortly.",
        status: "approved"
      },
      create: {
        id: "tpl_auto",
        organizationId: org.id,
        name: "auto_ack",
        language: "en",
        body: "Thanks for your message — an agent will be with you shortly.",
        status: "approved"
      }
    });

    const existingAuto = await tx.automationRule.findFirst({
      where: { id: "auto_demo_help" }
    });
    if (!existingAuto) {
      await tx.automationRule.create({
        data: {
          id: "auto_demo_help",
          organizationId: org.id,
          name: "Help keyword auto-ack",
          enabled: true,
          matchKeyword: "help",
          templateName: "auto_ack"
        }
      });
    }
  });

  await prisma.voiceAgentConfig.upsert({
    where: { organizationId: org.id },
    update: {
      enabled: true,
      companyName: "Demo Organization",
      agentName: "Verbal Assistant",
      systemPrompt:
        "You are the AI voice and chat agent for Demo Organization. Be helpful, concise, and professional. Never invent policies or order numbers.",
      knowledgeBase:
        "We offer WhatsApp customer support and CRM tools. Business hours: Mon–Fri 9am–6pm. Escalations go to a human agent when the customer asks for one.",
      firstMessage:
        "Hi, this is Verbal Assistant from Demo Organization. How can I help you today?",
      language: "en",
      voiceProvider: "11labs",
      voiceId: "sarah",
      model: "gpt-4o"
    },
    create: {
      id: "vac_demo",
      organizationId: org.id,
      enabled: true,
      companyName: "Demo Organization",
      agentName: "Verbal Assistant",
      systemPrompt:
        "You are the AI voice and chat agent for Demo Organization. Be helpful, concise, and professional. Never invent policies or order numbers.",
      knowledgeBase:
        "We offer WhatsApp customer support and CRM tools. Business hours: Mon–Fri 9am–6pm. Escalations go to a human agent when the customer asks for one.",
      firstMessage:
        "Hi, this is Verbal Assistant from Demo Organization. How can I help you today?",
      language: "en",
      voiceProvider: "11labs",
      voiceId: "sarah",
      model: "gpt-4o"
    }
  });

  console.log("Seed complete:", {
    organizationId: org.id,
    tenantAdmin: { email: user.email, password: "demo-password" },
    platformAdmin: { email: "platform@verbal.local", password: "demo-password" },
    voiceAgent: "vac_demo (Vapi AI voice context)"
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
