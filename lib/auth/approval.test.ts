import assert from "node:assert/strict";
import test from "node:test";
import { approvalRequired, initialApprovalStatus } from "./approval.ts";

test("por omissão as contas novas ficam por aprovar; só «false» desliga", () => {
  assert.equal(approvalRequired(undefined), true);
  assert.equal(approvalRequired(""), true);
  assert.equal(approvalRequired("true"), true);
  assert.equal(approvalRequired("0"), true); // na dúvida, modera
  assert.equal(approvalRequired("false"), false);
  assert.equal(approvalRequired(" FALSE "), false);
  assert.equal(initialApprovalStatus(true), "PENDING_APPROVAL");
  assert.equal(initialApprovalStatus(false), "APPROVED");
});
