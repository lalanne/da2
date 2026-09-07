// Manual mock: the real native module isn't available under Jest.
// Tests that touch Firestore override these with jest.mock().
const notMocked = (name) =>
  jest.fn(() => {
    throw new Error(`${name} is not mocked in this test`);
  });

module.exports = {
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn((ref) => ref),
  orderBy: jest.fn(),
  where: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  arrayUnion: jest.fn((...v) => ({ __arrayUnion: v })),
  // Reads / writes: throw unless a test provides its own implementation.
  getDoc: notMocked('getDoc'),
  getDocs: notMocked('getDocs'),
  setDoc: notMocked('setDoc'),
  addDoc: notMocked('addDoc'),
  updateDoc: notMocked('updateDoc'),
  deleteDoc: notMocked('deleteDoc'),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: notMocked('batch.commit'),
  })),
  // Listeners: no-op subscription that never fires.
  onSnapshot: jest.fn(() => () => {}),
};
