// Manual mock: the real native module isn't available under Jest.
// Tests that exercise Storage override these with jest.mock().
const notMocked = (name) =>
  jest.fn(() => {
    throw new Error(`${name} is not mocked in this test`);
  });

module.exports = {
  getStorage: jest.fn(() => ({})),
  ref: jest.fn((_storage, path) => ({ path })),
  putFile: notMocked('putFile'),
  writeToFile: notMocked('writeToFile'),
  deleteObject: notMocked('deleteObject'),
  getDownloadURL: notMocked('getDownloadURL'),
};
