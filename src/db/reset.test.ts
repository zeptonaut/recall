import assert from 'node:assert/strict';
import test from 'node:test';
import { parseResetTarget } from '@/db/reset';

test('parseResetTarget accepts localhost postgres urls', () => {
  assert.deepEqual(parseResetTarget('postgres://charlie:secret@localhost:5432/recall_test'), {
    database: 'recall_test',
    host: 'localhost',
    password: 'secret',
    port: '5432',
    username: 'charlie',
  });
});

test('parseResetTarget rejects non-local hosts', () => {
  assert.throws(
    () => parseResetTarget('postgres://charlie:secret@ep-bitter-brook.a.neon.tech:5432/recall_test'),
    /only supports local databases/
  );
});
