// Tests never touch the development database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://outbranch:outbranch@localhost:5442/outbranch_test"
process.env.AUTH_SECRET ??= "test-secret-test-secret-test-secret"
process.env.PROVIDER_MODE = "live"
process.env.QLOO_API_KEY = "test-qloo-key"
process.env.QLOO_API_URL = "https://qloo.test"
process.env.ANTHROPIC_API_KEY = "test-anthropic-key"
process.env.INNGEST_SIGNING_KEY = ""
