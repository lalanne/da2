const config = require('./app.json');

// Locally the files exist on disk. On EAS Build they're gitignored, so
// file environment variables (configured via `eas env:create`) supply the
// materialized paths instead. See specs/006-deployment-pilot.md.
config.expo.android.googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ?? config.expo.android.googleServicesFile;
config.expo.ios.googleServicesFile =
  process.env.GOOGLE_SERVICE_INFO_PLIST ?? config.expo.ios.googleServicesFile;

module.exports = config;
