module.exports = {
  CachesDirectoryPath: '/mock/caches',
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('')),
};
