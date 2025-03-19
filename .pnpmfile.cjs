module.exports = {
    hooks: {
      readPackage(pkg) {
        // Example: Force all dependencies to use a specific version
        if (pkg.dependencies?.['some-package']) {
          pkg.dependencies['some-package'] = '1.2.3';
        }
        return pkg;
      }
    }
  };
  