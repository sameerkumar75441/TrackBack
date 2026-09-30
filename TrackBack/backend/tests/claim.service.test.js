import assert from 'node:assert/strict';
import test from 'node:test';
import Claim from '../src/models/Claim.js';
import CustodyEvent from '../src/models/CustodyEvent.js';
import Item from '../src/models/Item.js';
import {
  approveClaim,
  createClaim,
  getClaimById,
  listClaims,
  rejectClaim,
} from '../src/services/claim.service.js';

const student = { id: '507f1f77bcf86cd799439011', role: 'student' };
const otherStudent = { id: '507f1f77bcf86cd799439012', role: 'student' };
const security = { id: '507f1f77bcf86cd799439013', role: 'security' };
const itemId = '507f1f77bcf86cd799439014';
const claimId = '507f1f77bcf86cd799439015';

CustodyEvent.create = async () => ({});

const createClaimDocument = (overrides = {}) => {
  const claim = {
    id: claimId,
    item: itemId,
    claimant: { toString: () => student.id },
    status: 'requested',
    ownershipProof: { description: 'The inside label has my initials.', details: 'Initials are S.K.' },
    verificationNotes: undefined,
    rejectionReason: undefined,
    verifiedBy: undefined,
    verifiedAt: undefined,
    save: async () => {},
    toObject() {
      return {
        item: this.item,
        claimant: this.claimant.toString(),
        status: this.status,
        ownershipProof: this.ownershipProof,
        verificationNotes: this.verificationNotes,
        rejectionReason: this.rejectionReason,
        verifiedBy: this.verifiedBy,
        verifiedAt: this.verifiedAt,
      };
    },
    ...overrides,
  };
  return claim;
};

const asQuery = (value) => ({
  select: () => Promise.resolve(value),
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
});

test('student claim uses JWT claimant, private proof is not returned, and item becomes claim_requested', { concurrency: false }, async (context) => {
  const originalFindAndUpdate = Item.findOneAndUpdate;
  const originalCreate = Claim.create;
  let itemUpdate;
  let createdPayload;
  Item.findOneAndUpdate = async (...args) => {
    itemUpdate = args;
    return { id: itemId };
  };
  Claim.create = async (payload) => {
    createdPayload = payload;
    return createClaimDocument();
  };
  context.after(() => {
    Item.findOneAndUpdate = originalFindAndUpdate;
    Claim.create = originalCreate;
  });

  const result = await createClaim(itemId, { description: 'The inside label has my initials.' }, student);
  assert.equal(createdPayload.claimant, student.id);
  assert.deepEqual(itemUpdate[0], { _id: itemId, status: 'approved' });
  assert.equal(itemUpdate[1].$set.status, 'claim_requested');
  assert.equal(result.ownershipProof, undefined);
});

test('ineligible items and duplicate active claims are rejected', { concurrency: false }, async (context) => {
  const originalFindAndUpdate = Item.findOneAndUpdate;
  const originalFindItem = Item.findById;
  const originalCreate = Claim.create;
  Item.findOneAndUpdate = async () => null;
  Item.findById = async () => ({ status: 'archived' });
  context.after(() => {
    Item.findOneAndUpdate = originalFindAndUpdate;
    Item.findById = originalFindItem;
    Claim.create = originalCreate;
  });

  await assert.rejects(
    createClaim(itemId, { description: 'The inside label has my initials.' }, student),
    (error) => error.statusCode === 409,
  );

  Item.findOneAndUpdate = async () => ({ id: itemId });
  Claim.create = async () => {
    const error = new Error('duplicate');
    error.code = 11000;
    throw error;
  };
  await assert.rejects(
    createClaim(itemId, { description: 'The inside label has my initials.' }, student),
    (error) => error.statusCode === 409,
  );
});

test('students cannot view another claimant private proof', { concurrency: false }, async (context) => {
  const originalFindById = Claim.findById;
  Claim.findById = () => asQuery(createClaimDocument());
  context.after(() => { Claim.findById = originalFindById; });

  const ownClaim = await getClaimById(claimId, student);
  assert.equal(ownClaim.ownershipProof, undefined);
  await assert.rejects(getClaimById(claimId, otherStudent), (error) => error.statusCode === 403);
});

test('students only receive their own non-private claims while security receives requested proof', { concurrency: false }, async (context) => {
  const originalFind = Claim.find;
  const ownClaim = createClaimDocument();
  const requestedClaim = createClaimDocument({ claimant: { toString: () => otherStudent.id } });
  const filters = [];
  Claim.find = (filter) => {
    filters.push(filter);
    return {
      select() { return this; },
      sort: async () => (filter.claimant ? [ownClaim] : [requestedClaim]),
    };
  };
  context.after(() => { Claim.find = originalFind; });

  const studentClaims = await listClaims(student);
  const securityClaims = await listClaims(security);
  assert.deepEqual(filters, [{ claimant: student.id }, { status: 'requested' }]);
  assert.equal(studentClaims[0].ownershipProof, undefined);
  assert.deepEqual(securityClaims[0].ownershipProof, requestedClaim.ownershipProof);
});

test('claim listings request the safe item summary needed for storage status', { concurrency: false }, async (context) => {
  const originalFind = Claim.find;
  let populatedPath;
  let populatedFields;
  const ownClaim = createClaimDocument({
    item: { _id: itemId, title: 'Blue bag', storageLocation: 'Shelf A-12' },
  });
  Claim.find = () => ({
    select() { return this; },
    populate(path, fields) {
      populatedPath = path;
      populatedFields = fields;
      return this;
    },
    sort: async () => [ownClaim],
  });
  context.after(() => { Claim.find = originalFind; });

  const claims = await listClaims(student);
  assert.equal(populatedPath, 'item');
  assert.match(populatedFields, /storageLocation/);
  assert.equal(claims[0].item.storageLocation, 'Shelf A-12');
});

test('security approval records verification and stops at claim_approved', { concurrency: false }, async (context) => {
  const originalFindClaim = Claim.findById;
  const originalFindItem = Item.findOneAndUpdate;
  const claim = createClaimDocument();
  let itemUpdate;
  Claim.findById = () => asQuery(claim);
  Item.findOneAndUpdate = async (...args) => {
    itemUpdate = args;
    return { id: itemId, status: 'claim_approved' };
  };
  context.after(() => {
    Claim.findById = originalFindClaim;
    Item.findOneAndUpdate = originalFindItem;
  });

  const result = await approveClaim(claimId, 'Proof details matched.', security);
  assert.equal(claim.status, 'approved');
  assert.equal(claim.verifiedBy, security.id);
  assert.ok(claim.verifiedAt instanceof Date);
  assert.equal(itemUpdate[1].$set.status, 'claim_approved');
  assert.notEqual(itemUpdate[1].$set.status, 'claimed');
  assert.deepEqual(result.ownershipProof, claim.ownershipProof);
});

test('security rejection records audit data and returns item to approved', { concurrency: false }, async (context) => {
  const originalFindClaim = Claim.findById;
  const originalFindItem = Item.findOneAndUpdate;
  const claim = createClaimDocument();
  let itemUpdate;
  Claim.findById = () => asQuery(claim);
  Item.findOneAndUpdate = async (...args) => {
    itemUpdate = args;
    return { id: itemId, status: 'approved' };
  };
  context.after(() => {
    Claim.findById = originalFindClaim;
    Item.findOneAndUpdate = originalFindItem;
  });

  await rejectClaim(claimId, 'The proof does not match the item.', 'Checked label details.', security);
  assert.equal(claim.status, 'rejected');
  assert.equal(claim.rejectionReason, 'The proof does not match the item.');
  assert.equal(claim.verifiedBy, security.id);
  assert.ok(claim.verifiedAt instanceof Date);
  assert.equal(itemUpdate[1].$set.status, 'approved');
});
