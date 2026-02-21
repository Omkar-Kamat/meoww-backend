export async function up(db) {
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ registrationNumber: 1 }, { unique: true });
  await db.collection('users').createIndex({ mobileNumber: 1 }, { unique: true });
  await db.collection('matchsessions').createIndex({ userA: 1, status: 1 });
  await db.collection('matchsessions').createIndex({ userB: 1, status: 1 });
  await db.collection('matchsessions').createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
}

export async function down(db) {
  await db.collection('users').dropIndex('email_1');
  await db.collection('users').dropIndex('registrationNumber_1');
  await db.collection('users').dropIndex('mobileNumber_1');
  await db.collection('matchsessions').dropIndex('userA_1_status_1');
  await db.collection('matchsessions').dropIndex('userB_1_status_1');
  await db.collection('matchsessions').dropIndex('createdAt_1');
}
