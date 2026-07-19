# Phase 1 UAT Packet

**Owner:** Manual UAT Coordinator  
**Environment:** Local `npm run dev` (default session `org_demo` / admin)

## Journeys

### UAT-1 Contacts
1. Open `/contacts`
2. Create contact Alice `+15551234567`
3. Confirm contact appears in directory
4. Switch organization ID to `org_other` and confirm Alice disappears

**Expected:** Tenant isolation on list.

### UAT-2 Inbound WhatsApp
1. Open `/inbox`
2. Simulate inbound webhook from `+15559876543`
3. Confirm conversation appears with service window open
4. Re-send same simulation with a fixed message id twice (via curl) and confirm no duplicate messages

**Expected:** One conversation, one message for duplicate provider IDs.

### UAT-3 Service window / templates
1. Create conversation for a contact without inbound
2. Attempt free-form send → expect rejection
3. Select approved template and send → success
4. Simulate inbound to open window, then free-form send → success

### UAT-4 AI assist
1. Open conversation with inbound history
2. Click **AI suggest reply**
3. Confirm composer fills and Settings → AI usage increases

### UAT-5 RBAC
1. Set role to `agent`
2. Attempt create contact → forbidden
3. Attempt AI usage list as agent → forbidden
4. Set role to `admin` → usage and audit visible

## Sign-off checklist
- [ ] All journeys pass
- [ ] No cross-tenant data visible when org switched
- [ ] Duplicate webhook does not duplicate messages
- [ ] Residual risks documented for Prisma/real Meta cutover
