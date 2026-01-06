# UAT Test Scripts (Phase 26)

## Instructions
- Each script should be executed by a broker partner user in UAT.
- Record pass/fail, screenshots, and notes.
- Log issues with severity (P0/P1/P2/P3).

## Script 1: Broker Portal - Dashboard
1. Login
2. Verify dashboard loads within 2 seconds
3. Verify lead counts match expected
4. Verify recent activity feed updates

## Script 2: Lead Assignment & Collaboration
1. Create a new lead
2. Assign lead to Agent A
3. Reassign to Agent B
4. Add note
5. Verify activity log shows all actions

## Script 3: Quote → Bind → Policy Activation
1. Open lead
2. Request quote from Carrier A
3. Compare quote results
4. Bind policy
5. Activate policy
6. Verify lead converted

## Script 4: Policy Lifecycle - Endorsement & Invoice
1. Add endorsement with premium delta
2. Verify premium updated
3. Generate invoice
4. Pay invoice
5. Verify invoice status

## Script 5: Claims Intake & Documents
1. Create claim
2. Upload document metadata (photo/receipt)
3. Add internal note
4. Move claim status to submitted → under_review
5. Verify activity log

## Script 6: Privacy & Compliance
1. Grant consent
2. Export data (json)
3. Request deletion
4. Fetch GDPR report

## Script 7: Role-based Access
1. Attempt restricted action as non-admin
2. Verify access denied

## Script 8: Performance
1. Bulk operations (reassign 100 leads)
2. Verify completion and UI responsiveness
