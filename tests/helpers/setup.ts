// Deterministic, offline defaults for unit tests. Integration tests override as needed.
process.env.DATABASE_URL ??= "postgresql://outbranch:outbranch@localhost:5442/outbranch"
process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret"
process.env.PROVIDER_MODE ??= "fixture"
